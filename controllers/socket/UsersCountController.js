const Account = require('../../models/Account')
const Friend = require('../../models/Friend')
const { getNowDateTime } = require('../../units/helpers')
const BaseSocketController = require('./BaseSocketController')

// Количество пользователей онлайн
let usersCount = 0
const userTimers = {}

class UsersCountController extends BaseSocketController {
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

  // Процедура при подключении сокета
  connect() {
    const { user } = this

    if (user) {
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
        this.notifyFriendsAboutMyOnlineStatus()

        // Смотрю есть ли новые заявки в друзья

        // Обновляю статус online
        this._online(user.id)
        console.log(`${user.username} connected`, getNowDateTime())
      }
    } else {
      this._changeUserCount(+1)
      console.log('a user connected', getNowDateTime())
    }
  }

  // Количество подключенных пользователей
  count(callback) {
    callback({ count: usersCount })
  }

  // При закрытии сокета
  disconnect() {
    const { user } = this

    // Если вышел неавторизванный пользователь
    if (!user) {
      this._changeUserCount(-1)
      console.log(`socket disconnect (noname)`, getNowDateTime())
      return
    }

    // Если нет других сессий этого пользователя
    if (!this._hasAnySockets()) {
      userTimers[user.id] = setTimeout(async () => {
        delete userTimers[user.id]

        console.log(`${user.username} disconnected`, getNowDateTime())

        this._changeUserCount(-1)

        // Если сессия была последней, то обновлем статус пользователя в базе на offline
        await this._online(user.id, false)

        // Сообщаю друзьям что игрок покинул сайт
        this.notifyFriendsAboutMyOnlineStatus(false)
      }, 2000)
    }
  }

  // Нотификация друзьям о статусе "онлайн" игрока
  async notifyFriendsAboutMyOnlineStatus(online = true) {
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

    // console.log(friends)
  }
}

module.exports = (io, socket) => {
  return new UsersCountController(io, socket)
}
