const Account = require('../../models/Account')
const Friend = require('../../models/Friend')
const { getNowDateTime } = require('../../units/helpers')
const BaseService = require('./BaseService')

// Количество пользователей онлайн
let usersCount = 0
const userTimers = {}

class UserCountService extends BaseService {
    // Проверяет, был ли подключен пользователь ранее (true) или это его первый сокет (false)
    _hasAnySockets() {
        const { socket } = this
        
        try {
            // Проходимся по всем сокетам
            for (const [sid, s] of socket.server.of('/').sockets) {
                // Если в сокете нет пользователя (он гость), то пропускаем его
                if (!s.user) continue
                // Если Id сокета не совпадает с текущим
                // а Id пользователей совпадают,
                // То возвращаем true (у пользователя есть другие открытые сокеты)
                if (sid != socket.id && s.user.id == socket.user.id) return true
            }
        } catch (e) {
            console.log(e)
        }
        // другие сокеты у пользователя не найдены (текущий сокет был единственным)
        return false
    }

    // Обновление статуса online у пользователя
    async _online(userId, on = true) {
        await Account.update({ online: on }, { where: { id: userId } })
    }

    // Меняет количество пользователей онлайн
    _changeUserCount(npr) {
        const { io } = this
        usersCount += npr
        io.emit('online.count', usersCount)
    }

    // Нотификация друзьям о статусе "онлайн" игрока
    async _notifyFriendsAboutMyOnlineStatus(online = true) {
        const { user, socket } = this
        if (!user) return

        // Береу инфу из профиля
        const profile = await Account.findByPk(user.id, {
            attributes: ['id', 'username', 'gender', 'updatedAt', 'avatar'],
        })

        // Беру список друзей
        const friends = await Friend.scope({
            method: ['friends', user.id],
        }).findAll()

        // Прохожу по каждому игроку
        friends.forEach((f) => {
            const { friend } = f

            // Если друг онлайн
            if (friend.online) {
                const friendIds = this.getUserSocketIds(friend.id)

                // Отправляю ему нотификацию
                friendIds.forEach((sid) => {
                    if (online) {
                        socket.broadcast.to(sid).emit('friend.online', profile)
                    } else {
                        socket.broadcast.to(sid).emit('friend.offline', profile)
                    }
                })
            }
        })
    }

    // Количество подключенных пользователей
    count() {
        return usersCount
    }

    // Подключение сокета
    connect() {
        const { user } = this

        if (!user) {
            console.log('a user connected', getNowDateTime())
            this._changeUserCount(+1)
            return
        }

        // Если пользователь есть в списке таймеров
        // то удаляем его оттуда
        if (userTimers[user.id]) {
            clearTimeout(userTimers[user.id])
            delete userTimers[user.id]
            return
        }

        // Если у пользователя открыт только один сокет
        // увеличиваю количество подключенных пользователей
        if (!this._hasAnySockets()) {
            this._changeUserCount(+1)

            // Сообщаю друзьям, что игрок появился в сети
            this._notifyFriendsAboutMyOnlineStatus()

            // Обновляю статус online
            this._online(user.id)
            console.log(`${user.username} connected`, getNowDateTime())
        }
    }

    // Закрытие сокета
    disconnect() {
        const { user } = this

        // Если вышел неавторизванный пользователь
        if (!user) {
            console.log(`socket disconnect (noname)`, getNowDateTime())
            this._changeUserCount(-1)
            return
        }

        // Выходим если есть другие сессии этого пользователя
        if (this._hasAnySockets()) {
            return
        }

        // Устанавливаю таймер выхода с сайта
        // нужно чтобы статус пользователя не менялся 
        // на оффлайн при переходе между страницами
        userTimers[user.id] = setTimeout(async () => {
            delete userTimers[user.id]

            console.log(`${user.username} disconnected`, getNowDateTime())

            this._changeUserCount(-1)

            // обновлем статус пользователя в базе на offline
            await this._online(user.id, false)

            // Сообщаю друзьям что игрок покинул сайт
            this._notifyFriendsAboutMyOnlineStatus(false)
        }, 3000)
    }

}

module.exports = UserCountService
