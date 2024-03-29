const { Op } = require('sequelize')
const Account = require('../../models/Account')
const Friend = require('../../models/Friend')
const Game = require('../../models/Game')
const GamePlayer = require('../../models/GamePlayer')
const Punishment = require('../../models/Punishment')
const { getNowDateTime } = require('../../units/helpers')
const BaseService = require('./BaseService')
const log = require('../../units/customLog')

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
      log(e)
    }
    // другие сокеты у пользователя не найдены (текущий сокет был единственным)
    return false
  }

  // Обновление статуса online у пользователя
  async _online(id, on = true) {
    await Account.update({ online: on }, { where: { id } })
    const { io, socket } = this
    const { account } = socket

    // const account = await Account.findOne({
    //     where: { id },
    //     attributes: ['username', 'avatar']
    // })

    const gameplayers = await GamePlayer.findAll({
      where: {
        accountId: account.id,
        status: [
          GamePlayer.playerStatuses.IN_GAME,
          GamePlayer.playerStatuses.FREEZED,
        ],
      },
      attributes: ['gameId'],
    })

    const status = on ? 'online' : 'offline'
    io.of('/online').emit(status, {
      username: account.username,
      avatar: account.avatar,
      punishments: account.punishments,
      gameplayers,
    })

    // Если пользователь находился в игре,
    // то уведомляю остальных игроков о том, что статус онлайн изменился
    GamePlayer.findOne({
      where: {
        accountId: id,
        status: [
          GamePlayer.playerStatuses.IN_GAME,
          GamePlayer.playerStatuses.KILLED,
          GamePlayer.playerStatuses.PRISONED,
          GamePlayer.playerStatuses.TIMEOUT,
          GamePlayer.playerStatuses.FREEZED,
          GamePlayer.playerStatuses.WON,
        ],
      },
      include: [
        {
          model: Game,
          where: {
            status: [
              Game.statuses.STARTED,
              Game.statuses.ENDED,
              Game.statuses.STOPPED,
            ],
          },
        },
      ],
    }).then((gp) => {
      if (gp) {
        io.of('/game').to(gp.gameId).emit(`user.${status}`, account.username)
      }
    })
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
      include: [
        {
          model: Punishment,
          attributes: ['type', 'untilAt', 'coolDate'],
          where: {
            untilAt: {
              [Op.gt]: new Date().toISOString(),
            },
          },
          required: false,
        },
        {
          model: GamePlayer,
          attributes: ['gameId'],
          required: false,
          where: {
            status: [
              GamePlayer.playerStatuses.IN_GAME,
              GamePlayer.playerStatuses.FREEZED,
            ],
          },
        },
      ],
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
    }
  }

  // Закрытие сокета
  disconnect() {
    const { user } = this

    // Если вышел неавторизванный пользователь
    if (!user) {
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

      this._changeUserCount(-1)

      // обновлем статус пользователя в базе на offline
      await this._online(user.id, false)

      // Сообщаю друзьям что игрок покинул сайт
      this._notifyFriendsAboutMyOnlineStatus(false)
    }, 5000)
  }
}

module.exports = UserCountService
