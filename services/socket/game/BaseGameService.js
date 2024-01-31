const { Op } = require('sequelize')
const Account = require('../../../models/Account')
const Game = require('../../../models/Game')
const GameChat = require('../../../models/GameChat')
const GameChatUsers = require('../../../models/GameChatUsers')
const GamePlayer = require('../../../models/GamePlayer')
const GameRole = require('../../../models/GameRole')
const Role = require('../../../models/Role')
const GameLog = require('../../../models/GameLog')
const Games = require('../../../units/GamesManager')
const BaseService = require('../BaseService')

class BaseGameService extends BaseService {
  constructor(io, socket) {
    super(io, socket)

    const { user, gameId } = socket

    // Подключение сокета к комнате игры
    socket.join(gameId)

    if (user) {
      // Получаю информацию
      GamePlayer.findOne({
        where: {
          gameId,
          accountId: user.id,
          status: [
            GamePlayer.playerStatuses.IN_GAME,
            GamePlayer.playerStatuses.FREEZED,
          ],
        },
      }).then((gp) => {
        if (gp) socket.isPlayer = true
      })
    }
  }

  // Получить свою роль
  async getRole() {
    const { user, gameId } = this.socket

    if (user) {
      const player = await GamePlayer.findOne({
        where: {
          gameId,
          accountId: user.id,
          status: [
            GamePlayer.playerStatuses.IN_GAME,
            GamePlayer.playerStatuses.FREEZED,
          ],
        },
        include: [
          { model: Role },
          {
            model: Account,
            attributes: ['username'],
          },
        ],
      })

      if (player) {
        // Если роль "Дитя"
        if (player.role.id == Game.roles.CHILD) {
          const citizen = await Role.findOne({
            where: { id: Game.roles.CITIZEN },
          })
          // Показываю игроку, что он честный житель
          return {
            username: player.account.username,
            name: citizen.name,
            id: citizen.id,
          }
        }
        return {
          username: player.account.username,
          name: player.role.name,
          id: player.role.id,
        }
      }
    }

    return {
      username: '',
      name: 'Зритель',
      id: 0,
    }
  }

  // Получение известных ролей
  async getRoles() {
    const { user, gameId } = this.socket

    if (!user) return

    const roles = GameRole.findAll({
      where: {
        gameId,
        accountId: user.id,
      },
      include: [
        {
          model: Role,
          attributes: ['name', 'id'],
        },
        {
          model: Account,
          as: 'player',
          attributes: ['username'],
        },
      ],
    })

    const data = {
      roles,
    }

    return roles
  }

  // История сообщений
  async getMessages() {
    const { socket, user } = this
    const { gameId } = socket

    const messages = await GameChat.findAll({
      where: {
        gameId,
        private: false,
      },
      attributes: ['message', 'private', 'createdAt', 'username'],
      include: [
        {
          model: Account,
          attributes: ['username'],
          required: false,
        },
        {
          model: GameChatUsers,
          include: [
            {
              model: Account,
              attributes: ['username'],
            },
          ],
        },
      ],
    })

    let privateMessages = []
    let pmForMe = []

    if (user) {
      // Приватные сообщения, которые игрок писал сам
      privateMessages = await GameChat.findAll({
        where: {
          gameId,
          accountId: user.id,
          private: true,
        },
        attributes: ['message', 'private', 'createdAt', 'username'],
        include: [
          {
            model: Account,
            attributes: ['username'],
            required: false,
          },
          {
            model: GameChatUsers,
            include: [
              {
                model: Account,
                attributes: ['username'],
              },
            ],
          },
        ],
      })

      // Приватные сообщения, которые были написаны игроку другим игроком
      pmForMe = await GameChat.findAll({
        where: {
          gameId,
          accountId: {
            [Op.ne]: user.id,
          },
          private: true,
        },
        attributes: ['message', 'private', 'createdAt', 'username'],
        include: [
          {
            model: Account,
            attributes: ['username'],
            required: false,
          },
          {
            model: GameChatUsers,
            where: {
              accountId: user.id,
            },
            include: [
              {
                model: Account,
                attributes: ['username'],
              },
            ],
          },
        ],
      })
    }

    const resultMessages = [...messages, ...privateMessages, ...pmForMe].sort(
      (a, b) => {
        if (a.createdAt > b.createdAt) return 1
        if (a.createdAt < b.createdAt) return -1
        return 0
      }
    )

    return resultMessages
  }

  // Получение лога игры
  async getLog() {
    const { socket } = this
    const { gameId } = socket

    const where = { gameId }

    const game = await Game.findByPk(gameId)

    // Если игра ещё идёт, то не показываю скрытые записи лога
    if (game.status == Game.statuses.STARTED) {
      where.hidden = false
    }

    const log = await GameLog.findAll({
      where,
      attributes: ['message', 'type'],
    })

    return log
  }

  // Пришло сообщение
  async message(message, isPrivate = false) {
    const { user, io, socket } = this
    const { gameId } = socket

    if (!socket.isPlayer) return

    if (!user) {
      throw new Error('Не авторизован')
    }

    const game = Games.getGame(gameId)

    if (!game) {
      throw new Error('Игра не найдена')
    }

    const player = game.getPlayerById(user.id)
    if (player.status == GamePlayer.playerStatuses.FREEZED) {
      throw new Error('Путана заманила вас в свои сети')
    }

    if (player.status != GamePlayer.playerStatuses.IN_GAME) {
      throw new Error('Вы не можете писать в этой игре')
    }

    // Сохраняю сообщение в базу
    const msg = await GameChat.newMessage(gameId, user.id, message, isPrivate)

    if (!isPrivate) {
      // Рассылаю сообщение всем подключенным пользователям
      io.of('/game').to(gameId).emit('message', msg)
    } else {
      // Отправляю самому игроку
      const ids = this.getUserSockets(user.id, '/game')
      ids.forEach((sock) => {
        sock.emit('message', msg)
      })

      // Отправляю игрокам, которые были выделены в сообщении
      msg.gamechatusers.forEach((cu) => {
        if (cu.accountId != user.id) {
          const ids = this.getUserSockets(cu.accountId, '/game')
          ids.forEach((sock) => {
            sock.emit('message', msg)
          })
        }
      })
    }
  }

  // Голос
  async vote(username) {
    const { socket } = this
    const { user, gameId, isPlayer } = socket

    if (!user) throw new Error('Не авторизован')
    if (!isPlayer) throw new Error('Вы не можете голосовать в этой игре')
    if (!username || !gameId) throw new Error('Нет необходимых данных')

    // Беру текущую игру
    const game = Games.getGame(gameId)

    // Игра должна быть загружена
    if (!game) throw new Error('Игра не найдена')

    // Голосую
    await game.vote(username, user.id)
  }

  // Выстрел
  async shot(username) {
    const { user, gameId } = this.socket

    if (!user) return

    // Беру текущую игру
    const game = Games.getGame(gameId)

    // Игра должна быть загружена
    if (!game) throw new Error('Игра не найдена')

    // Стреляю по игроку
    await game.shot(username, user.id)
  }

  // Прова кома
  async prova(username) {
    const { user, gameId } = this.socket

    if (!user) return

    // Беру текущую игру
    const game = Games.getGame(gameId)

    if (!game) throw new Error('Игра не найдена')

    // Запускаю процедуру проверки
    await game.prova(username, user.id)
  }

  // Начал писать сообщение
  typingBegin() {
    const { socket } = this

    if (!socket.isPlayer) return

    const { user, gameId } = socket

    if (!user) return

    // Беру текущую игру
    const game = Games.getGame(gameId)

    const player = game.getPlayerById(user.id)
    if (player.status != GamePlayer.playerStatuses.IN_GAME) {
      throw new Error('Вы не можете писать в этой игре')
    }

    // Игра должна быть загружена
    if (!game) throw new Error('Игра не найдена')

    game.typingBegin(user.id)
  }

  // Завершил писать соощение
  typingEnd() {
    const { socket } = this

    if (!socket.isPlayer) return

    const { user, gameId } = socket

    if (!user) return

    // Беру текущую игру
    const game = Games.getGame(gameId)

    const player = game.getPlayerById(user.id)
    if (player.status != GamePlayer.playerStatuses.IN_GAME) {
      throw new Error('Вы не можете писать в этой игре')
    }

    // Игра должна быть загружена
    if (!game) throw new Error('Игра не найдена')

    game.typingEnd(user.id)
  }
}

module.exports = BaseGameService
