const Account = require('../../../models/Account')
const Game = require('../../../models/Game')
const GameChat = require('../../../models/GameChat')
const GameChatUsers = require('../../../models/GameChatUsers')
const GamePlayer = require('../../../models/GamePlayer')
const GameStep = require('../../../models/GameStep')
const Role = require('../../../models/Role')
const Games = require('../../../units/Games')
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
      },
    })

    // Игрок должен быть в игре
    if (!inGame) throw new Error('Вас нет в этой игре')

    // Игрок должен иметь активный статус (в игре)
    if (inGame.status != GamePlayer.playerStatuses.IN_GAME)
      throw new Error('Вы не можете голосовать в этой игре')

    console.log(gameId, username)

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

    console.log(period, day)

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
  }
}

module.exports = ChatService
