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
const Punishment = require('../../../models/Punishment')
const Claim = require('../../../models/Claim')
const Chat = require('../../../models/Chat')

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
            ...citizen.toJSON(),
          }
        }
        return {
          username: player.account.username,
          ...player.role.toJSON(),
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
      throw new Error('Любовница заманила вас в свои сети')
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

  // Жалоба
  async claim(data) {
    const { username, type, comment, gameId } = data

    if (!type || !username || !gameId) {
      throw new Error('Нет необходимых данных')
    }

    const { account } = this.socket

    if (!account) {
      throw new Error('Не авторизован')
    }

    if (type < 4 || type > 8) {
      throw new Error('Не верный тип')
    }

    // Проверяю прошёл ли месяц после регистрации
    const hasMonth = await Account.findOne({
      where: {
        id: account.id,
        createdAt: {
          [Op.lt]: new Date(
            Date.now() - 1000 * 60 * 60 * 24 * 30
          ).toISOString(),
        },
      },
    })

    if (!hasMonth) {
      throw new Error(
        'Вы сможете отправлять жалобы только через месяц поле регистрации на сайте.'
      )
    }

    // Проверяю есть ли возмоность жаловаться
    const hasNoClaim = await Punishment.findOne({
      where: {
        accountId: account.id,
        type: Punishment.types.NO_CLAIM,
        untilAt: {
          [Op.gte]: new Date().toISOString(),
        },
      },
    })

    if (hasNoClaim) {
      throw new Error(
        `Вы не можете отправлять жалобы до ${getCoolDateTime(
          hasNoClaim.untilAt
        )}`
      )
    }

    // Беру пользователя на которого пришла жалоба
    const player = await Account.findOne({
      where: {
        username,
      },
    })

    if (!player) {
      throw new Error('Пользователь не найден')
    }

    if (player.id == account.id) {
      throw new Error(
        'Вы имеете право хранить молчание и не обязаны свидетельствовать против себя!'
      )
    }

    // Если у пользователя уже есть запрет, то выходим
    const hasPunishment = await Punishment.findOne({
      where: {
        accountId: player.id,
        type: Punishment.types.NO_PLAYING,
        untilAt: {
          [Op.gte]: new Date().toISOString(),
        },
      },
    })

    if (hasPunishment) {
      throw new Error('Пользователь уже получил запрет')
    }

    const claimData = {
      accountId: account.id,
      playerId: player.id,
      type,
      gameId,
    }

    // Проверяю, отправлял ли уже этот пользователь жалобу в течении часа
    const hourAgo = new Date(Date.now() - 1000 * 60 * 60).toISOString()
    const hasClaim = await Claim.findOne({
      where: {
        ...claimData,
        createdAt: {
          [Op.gte]: hourAgo,
        },
      },
    })

    if (hasClaim) {
      throw new Error('Вы уже отправляли жалобу на этого игрока')
    }

    if (comment) claimData.comment = comment

    // Создаю жалобу
    const claim = await Claim.create(claimData)

    // Если жалоба от админа, то сразу создаю наказание
    if (account.role == 1) {
      const pun = await this._makePunishment(player, type, comment)
      claim.punishmentId = pun.id
      await claim.save()
      return
    }

    // Получаю жалобы на игрока за час
    const around60minute = new Date(Date.now() - 1000 * 60 * 60).toISOString()
    const claims = await Claim.findAll({
      where: {
        playerId: player.id,
        type,
        createdAt: {
          [Op.gt]: around60minute,
        },
      },
    })

    // достигнут лимит жалоб
    if (claims.length == Claim.limit(type)) {
      // Создаю наказание
      const punish = await this._makePunishment(
        player,
        type,
        'Запрет по результатам самоконтроля'
      )

      // Связываю жалобы с наказанием
      for (const index in claims) {
        const claimItem = claims[index]
        claimItem.punishmentId = punish.id
        await claimItem.save()
      }
    }
  }

  // Создать наказание
  async _makePunishment(player, type, comment) {
    const punishmentData = {
      accountId: player.id,
      type: Punishment.types.NO_PLAYING,
    }

    // Смотрю количество предыдущих нказаний по этому типу
    const punishmentsCount = await Punishment.count({
      where: punishmentData,
    })

    if (comment) punishmentData.comment = comment

    const until = new Date(
      Date.now() + 1000 * 60 * 60 * (punishmentsCount + 1)
    ).toISOString()

    punishmentData.untilAt = until

    // Создаю наказание
    const punish = await Punishment.create(punishmentData)

    const date = getCoolDateTime(until)

    const reason = Claim.reason(type)
    const message = `Вам запрещено участие в играх до ${date} по причине: ${reason}`

    const sysmsg = await Chat.sysMessage(
      `[${player.username}] запрещается участие в играх до ${date} за ${reason}.`
    )

    // Рассылаю сообщение всем подключенным пользователям
    this.io.of('/lobbi').emit('chat.message', sysmsg)

    // Уведомляю нарушителя
    await this.notify(player.id, message, 2)

    return punish
  }
}

module.exports = BaseGameService
