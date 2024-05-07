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
const { getCoolDateTime } = require('../../../units/helpers')
const htmlspecialchars = require('htmlspecialchars')

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

    const game = await Game.findByPk(gameId)

    if (!game) return []

    if (game.period == Game.periods.END) {
      privateMessages = await GameChat.findAll({
        where: {
          gameId,
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
    } else {
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

    const floodBlockTime = game.isFlooder(user.id)

    if (floodBlockTime) {
      const ids = this.getUserSockets(user.id, '/game')
      ids.forEach((sock) => sock.emit('flood', floodBlockTime))
      throw new Error(
        `Вы не можете писать в чат по причине флуда ещё ${Math.ceil(
          floodBlockTime / 1000
        )} секунд`
      )
    }

    const player = game.getPlayerById(user.id)
    if (player.status == GamePlayer.playerStatuses.FREEZED) {
      throw new Error('Любовница заманила вас в свои сети')
    }

    if (player.status != GamePlayer.playerStatuses.IN_GAME) {
      throw new Error('Вы не можете писать в этой игре')
    }

    try {
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

        // Если приват отключен
        if (!game.game.fullprivate && game.game.period != Game.periods.START) {
          // Шёпот
          const users = msg.gamechatusers
            .map(
              (u) => `<span class='recipient'>[${u.account.username}]</span>`
            )
            .join(', ')
          const forma =
            player.account.gender == Account.genders.FEMALE
              ? 'шепнула'
              : player.account.gender == Account.genders.MALE
              ? 'шепнул'
              : 'шепнул(а)'
          const whisper = `<span class='whisper'><span class='initiator'>[${player.username}]</span> что-то ${forma} <span class='recipients'>${users}</span></span>`
          game.systemMessage(whisper)
        }
      }
    } catch (error) {
      if (error.message == 'flood') {
        const time = game.blockFlooder(user.id)
        const ids = this.getUserSockets(user.id, '/game')
        ids.forEach((sock) => sock.emit('flood', time))
      } else {
        throw new Error(error)
      }
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

    // Игра должна быть загружена
    if (!game) return

    const floodBlockTime = game.isFlooder(user.id)
    if (floodBlockTime) return

    const player = game.getPlayerById(user.id)
    if (player.status != GamePlayer.playerStatuses.IN_GAME) {
      throw new Error('Вы не можете писать в этой игре')
    }

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
    const { username, type, comment } = data
    const { user, gameId } = this.socket

    if (!type || !username || !gameId) {
      throw new Error('Нет необходимых данных')
    }

    if (!user) {
      throw new Error('Не авторизован')
    }

    const account = await Account.findOne({ where: { id: user.id } })

    if (!account) {
      throw new Error('Ваш аккаунт не авторизован')
    }

    if (type < 4 || type > 8) {
      throw new Error('Не верный тип')
    }

    // Проверяю прошёл ли месяц после регистрации
    const hasMonth = await Account.findOne({
      where: {
        id: account.id,
        createdAt: {
          [Op.lt]: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
        },
      },
    })

    if (!hasMonth) {
      throw new Error(
        'Вы сможете отправлять жалобы только через неделю поле регистрации на сайте.'
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

    // Проверяю, есть ли игрок в этой игре
    const hasAccountInGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: account.id,
        status: {
          [Op.gte]: GamePlayer.playerStatuses.IN_GAME,
        },
      },
    })

    if (!hasAccountInGame) {
      throw new Error(
        'Вы не можете жаловаться в игре, если не принимали в ней участие'
      )
    }

    const hasPlayerInGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: player.id,
        status: {
          [Op.gte]: GamePlayer.playerStatuses.IN_GAME,
        },
      },
    })

    if (!hasPlayerInGame) {
      throw new Error(
        'Вы не можете жаловаться на игрока, который не участвовал в этой игре'
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

    if (comment) claimData.comment = htmlspecialchars(comment)

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
      `[${player.username}] запрещается участие в играх до ${date} по причине: ${reason}.`
    )

    // Рассылаю сообщение всем подключенным пользователям
    this.io.of('/lobbi').emit('chat.message', sysmsg)

    // Уведомляю нарушителя
    await this.notify(player.id, message, 2)

    return punish
  }

  // Остановка партии
  async stopTheGame() {
    const { socket } = this

    const { user, gameId } = socket
    if (!user) return

    const account = await Account.findByPk(user.id)
    if (!account) return

    // Останавливать партии могут только админы
    if (account.role != 1) return

    // Беру текущую игру
    const game = Games.getGame(gameId)

    if (!game) return

    await game.stop()
  }
}

module.exports = BaseGameService
