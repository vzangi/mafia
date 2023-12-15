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

    if (user) {
      const privateMessages = []
    }

    return messages
  }

  // Пришло сообщение
  async message(message, isPrivate = false) {
    const { user, io, socket } = this
    const { gameId } = socket
    if (!user) {
      throw new Error('Не авторизован')
    }

    const game = Games.getGame(gameId)

    if (!game) {
      throw new Error('Игра не найдена')
    }

    // Сохраняю сообщение в базу
    const msg = await GameChat.newMessage(gameId, user.id, message, isPrivate)

    if (!isPrivate) {
      // Рассылаю сообщение всем подключенным пользователям
      io.of('/game').to(gameId).emit('message', msg)
    } else {
      console.log(msg.gamechatusers)
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

    // Беру свои голоса в этот день
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
      `${inGame.username} хочет отправить в тюрьму ${username}`
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

    if (steps.length == playersInGame.length) {
      await game.nextPeriod()
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
      // Если максимальное количество голсов умноженное на 2 больше чем количество игроков
      // перехожу к следующему периоду
      if (playersInGame.length < maxVotes.get('votesCount') * 2) {
        await game.nextPeriod()
        return
      }
    }
  }

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

    return roles
  }

  async shot(username) {
    const { user, gameId } = this.socket

    if (!user) return

    // проверки...

    const player = await Account.findOne({
      where: {
        username,
      },
    })

    // Беру текущую игру
    const game = Games.getGame(gameId)

    // Игра должна быть загружена
    if (!game) throw new Error('Игра не найдена')

    const { day } = game.game

    await GameStep.create({
      gameId,
      day,
      accountId: user.id,
      playerId: player.id,
      stepType: GameStep.stepTypes.NIGHT,
    })

    const shots = await GameStep.findAll({
      where: {
        gameId,
        day,
        stepType: GameStep.stepTypes.NIGHT,
      },
    })

    const players = game.players.filter(
      (p) =>
        p.roleId == Game.roles.MAFIA &&
        p.status == GamePlayer.playerStatuses.IN_GAME
    )

    if (shots.length == players.length) {
      await game.nextPeriod()
    }
  }

  typingBegin() {
    const { socket } = this

    if (!socket.isPlayer) return

    const { user, gameId } = socket

    // Беру текущую игру
    const game = Games.getGame(gameId)

    // Игра должна быть загружена
    if (!game) throw new Error('Игра не найдена')

    game.typingBegin(user.id)
  }

  typingEnd() {
    const { socket } = this

    if (!socket.isPlayer) return

    const { user, gameId } = socket

    // Беру текущую игру
    const game = Games.getGame(gameId)

    // Игра должна быть загружена
    if (!game) throw new Error('Игра не найдена')

    game.typingEnd(user.id)
  }
}

module.exports = ChatService
