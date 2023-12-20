const { Op } = require('sequelize')
const Account = require('../../../models/Account')
const Game = require('../../../models/Game')
const GameChat = require('../../../models/GameChat')
const GameChatUsers = require('../../../models/GameChatUsers')
const GamePlayer = require('../../../models/GamePlayer')
const GameRole = require('../../../models/GameRole')
const GameStep = require('../../../models/GameStep')
const Role = require('../../../models/Role')
const Games = require('../../../units/GamesManager')
const sequelize = require('../../../units/db')
const BaseService = require('../BaseService')

class ChatService extends BaseService {
  constructor(io, socket) {
    super(io, socket)

    const { user, gameId } = socket

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
          status: [GamePlayer.playerStatuses.IN_GAME],
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
    if (player.status != GamePlayer.playerStatuses.IN_GAME) {
      throw new Error('Вы не можете писать в этой игре')
    }

    // Сохраняю сообщение в базу
    const msg = await GameChat.newMessage(gameId, user.id, message, isPrivate)

    if (!isPrivate) {
      // Рассылаю сообщение всем подключенным пользователям
      io.of('/game').to(gameId).emit('message', msg)
    } else {
      console.log(msg.gamechatusers)

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
    const { socket, io } = this
    const { user, gameId, isPlayer } = socket

    if (!user) throw new Error('Не авторизован')

    if (!isPlayer) throw new Error('Вы не можете голосовать в этой игре')

    if (!username || !gameId) throw new Error('Нет необходимых данных')

    // Текущий игрок в партии
    const inGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: user.id,
        status: [GamePlayer.playerStatuses.IN_GAME],
      },
    })

    // Игрок должен быть в игре
    if (!inGame) throw new Error('Вас нет в этой игре')

    // Игрок должен иметь активный статус (в игре)
    if (inGame.status != GamePlayer.playerStatuses.IN_GAME)
      throw new Error('Вы не можете голосовать в этой игре')

    // Игрок за которого голосуют
    const player = await GamePlayer.findOne({
      where: {
        gameId,
        username,
        status: [
          GamePlayer.playerStatuses.IN_GAME,
          GamePlayer.playerStatuses.FREEZED,
          GamePlayer.playerStatuses.KILLED,
          GamePlayer.playerStatuses.PRISONED,
          GamePlayer.playerStatuses.TIMEOUT,
        ],
      },
      attributes: ['accountId', 'status'],
    })

    if (!player) throw new Error('Игрок не найден в этой игре')

    const playerId = player.accountId

    if (playerId == user.id) throw new Error('Нельзя голосовать против себя')

    if (
      player.status != GamePlayer.playerStatuses.IN_GAME &&
      player.status != GamePlayer.playerStatuses.FREEZED
    )
      throw new Error('Нельза голосовать в выбывшего игрока')

    // Беру текущую игру
    const game = Games.getGame(gameId)

    // Игра должна быть загружена
    if (!game) throw new Error('Игра не найдена')

    const { period, day } = game.game

    if (period != Game.periods.DAY) throw new Error('Голосование окончено')

    // Ищу свой голос в этот день
    const haveVote = await GameStep.findOne({
      where: {
        gameId,
        accountId: user.id,
        day: day,
        stepType: GameStep.stepTypes.DAY,
      },
    })

    // Если уже голосовал
    if (haveVote) throw new Error('Вы уже проголосовали')

    // Записываю голос в базу
    await GameStep.create({
      gameId,
      accountId: user.id,
      playerId,
      day: day,
      stepType: GameStep.stepTypes.DAY,
    })

    game.systemMessage(
      `<b>${inGame.username}</b> хочет отправить в тюрьму <b>${username}</b>`
    )

    // Уведомляю всех о голосе
    io.of('/game').to(gameId).emit('vote', inGame.username, username)

    // Проверяю, можно ли завершать голосование

    const steps = await GameStep.findAll({
      where: {
        gameId,
        day,
        stepType: 1,
      },
    })

    const playersInGame = await GamePlayer.findAll({
      where: {
        gameId,
        status: [
          GamePlayer.playerStatuses.IN_GAME,
          GamePlayer.playerStatuses.FREEZED,
        ],
      },
    })

    // Количество ходов равно количеству игроков
    if (steps.length == playersInGame.length) {
      console.log('Количество ходов равно количеству игроков')

      // Завершаю голосование
      game.game.deadline = 0
      return
    }

    // Беру игрока с максимальным количеством голосов
    const maxVotes = await GameStep.findOne({
      where: {
        gameId,
        day,
      },
      group: 'playerId',
      attributes: [
        'playerId',
        [sequelize.fn('COUNT', sequelize.col('*')), 'votesCount'],
      ],
      order: [['votesCount', 'DESC']],
      limit: 1,
    })

    if (maxVotes) {
      // максимальное количество голсов умноженное на 2 больше чем количество игроков
      if (playersInGame.length < maxVotes.get('votesCount') * 2) {
        console.log(
          'максимальное количество голсов умноженное на 2 больше чем количество игроков'
        )

        // завершаю голосование
        game.game.deadline = 0
        return
      }
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

  async prova(username) {
    const { user, gameId } = this.socket

    if (!user) return

    // Беру текущую игру
    const game = Games.getGame(gameId)

    if (!game) throw new Error('Игра не найдена')

    // Запускаю процедуру проверки
    await game.prova(username, user.id)
  }

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

module.exports = ChatService
