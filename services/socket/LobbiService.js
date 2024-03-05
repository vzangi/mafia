const htmlspecialchars = require('htmlspecialchars')
const Account = require('../../models/Account')
const Friend = require('../../models/Friend')
const Claim = require('../../models/Claim')
const Game = require('../../models/Game')
const GamePlayer = require('../../models/GamePlayer')
const GameInitRole = require('../../models/GameInitRole')
const Punishment = require('../../models/Punishment')
const minCount = 3
const GamesManager = require('../../units/GamesManager')
const BaseService = require('./BaseService')
const { getCoolDateTime } = require('../../units/helpers')
const { Op } = require('sequelize')
const Chat = require('../../models/Chat')
const Contest = require('../../models/Contest')
const ContestPlayer = require('../../models/ContestPlayer')
const log = require('../../units/customLog')

class LobbiService extends BaseService {
  // Получение текущих заявок
  async getGames() {
    const data = {}
    data.games = await Game.scope('def').findAll()

    const { user } = this

    if (user) {
      data.incontest = await ContestPlayer.findOne({
        where: {
          accountId: user.id,
        },
      })
    }

    data.concount = await ContestPlayer.concount()

    return data
  }

  // Новая заявка на игру
  async makeGame(settings) {
    let { gametypeId, playersCount, waitingTime, description, mode } = settings

    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!gametypeId || !playersCount || !waitingTime) {
      throw new Error('Нет необходимых данных')
    }

    if (gametypeId < 1 || gametypeId > 5) {
      throw new Error('Нет у нас таких режимов')
    }

    if (gametypeId == 1 || gametypeId == 2) {
      if (playersCount < minCount) {
        throw new Error(`Минимальное количество игроков - ${minCount}`)
      }
    }

    if (gametypeId == 4) {
      if (playersCount < 3) {
        throw new Error(
          'Минимальное количество игроков в мультиролевом режиме - 3'
        )
      }
    }

    if (playersCount > 20) {
      throw new Error('Максимальное количество игроков - 20')
    }

    if (waitingTime < 1) {
      throw new Error('Минимальное время для заявки - 1 минута')
    }

    if (waitingTime > 20) {
      throw new Error('Максимальное время для заявки - 20 минут')
    }

    const account = await Account.findByPk(user.id, {
      attributes: ['username', 'vipTo', 'vip'],
    })

    if (!account) {
      throw new Error('Игрок не найден')
    }

    if (gametypeId == 5) {
      const { roles } = settings

      if (!roles) {
        throw new Error('Не указаны роли')
      }

      // Проверка на корректность ролей
      this._checkRoles(roles)

      const totalRolesCount = roles.reduce((a, b) => a + b[1], 0)
      if (totalRolesCount > playersCount) {
        throw new Error('Количество ролей больше количества игроков')
      }

      // Только вип
      if (!account.vip) {
        throw new Error(
          'Заявки в режиме конструктора могут создавать только vip-игроки'
        )
      }
    }

    // Проверяю, может ли игрок создать заявку:

    // 1. не находится в другой заявке
    const inGameWaithing = await GamePlayer.findOne({
      where: {
        accountId: user.id,
        status: GamePlayer.playerStatuses.WHAITNG,
      },
    })

    if (inGameWaithing) {
      throw new Error('Вы находитесь в другой заявке')
    }

    // 1.1 не ждёт сорев
    const hasContest = await ContestPlayer.findOne({
      where: {
        accountId: user.id,
      },
    })

    if (hasContest) {
      throw new Error('Вы находитесь в другой заявке')
    }

    // 2. не находится в игре
    const inGame = await GamePlayer.findOne({
      where: {
        accountId: user.id,
        status: [
          GamePlayer.playerStatuses.IN_GAME,
          GamePlayer.playerStatuses.FREEZED,
        ],
      },
    })

    if (inGame) {
      throw new Error('Вы находитесь в игре')
    }

    // 3. Нет запрета на создание заявки ...
    const hasPunish = await Punishment.findOne({
      where: {
        accountId: user.id,
        type: Punishment.types.NO_CREATION,
        untilAt: {
          [Op.gte]: new Date().toISOString(),
        },
      },
    })

    if (hasPunish) {
      throw new Error(
        `У вас действет запрет на создание заявок до ${getCoolDateTime(
          hasPunish.untilAt
        )}`
      )
    }

    // Проверяю, есть ли запрет на игры
    const hasPlayPunish = await Punishment.findOne({
      where: {
        accountId: user.id,
        type: Punishment.types.NO_PLAYING,
        untilAt: {
          [Op.gte]: new Date().toISOString(),
        },
      },
    })

    if (hasPlayPunish) {
      throw new Error(
        `У вас действет запрет на участие в играх до ${getCoolDateTime(
          hasPlayPunish.untilAt
        )}`
      )
    }

    // Устанавливаю дедлайн - время когда заявка удалиться,
    // если нужное количество игроков не соберётся
    const dt = new Date()
    const deadline = new Date(dt.getTime() + waitingTime * 60000)

    description = htmlspecialchars(description)
    if (description.length > 69) {
      description = description.substr(0, 69)
    }

    // Создаю заявку на игру
    const newGame = await Game.create({
      accountId: user.id,
      gametypeId,
      playersCount,
      waitingTime,
      description,
      deadline,
      mode,
    })

    // Добавляю в неё игрока
    const player = await GamePlayer.create({
      accountId: user.id,
      username: account.username,
      gameId: newGame.id,
    })

    // Если конструктор - добавляю в базу список ролей
    if (gametypeId == 5) {
      const { roles } = settings
      for (const index in roles) {
        const [roleId, cnt] = roles[index]
        if (cnt == 0) continue

        await GameInitRole.create({
          gameId: newGame.id,
          roleId,
          cnt,
        })
      }
    }

    // Получаю новую заявку
    const game = await Game.scope('def').findByPk(newGame.id)

    // Добавляю её в список ожидающих заявок
    GamesManager.whatingGames[game.id] = game

    // Уведомляю подключённые сокеты о новой заявке
    const { socket } = this
    socket.broadcast.emit('game.new', game)

    // и возвращаю её
    return game
  }

  // Заявка на соревновательный режим
  async addToContest(data) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const { contests } = data

    if (!contests || contests.length < 2) {
      throw new Error(
        'Чтобы сыграть, нужно выбрать как минимум два из предложенных вариантов'
      )
    }

    const account = await Account.findByPk(user.id, {
      attributes: ['username'],
    })

    if (!account) {
      throw new Error('Игрок не найден')
    }

    // Проверяю, может ли игрок создать заявку:

    // 1. не находится в другой заявке
    const inGameWaithing = await GamePlayer.findOne({
      where: {
        accountId: user.id,
        status: GamePlayer.playerStatuses.WHAITNG,
      },
    })

    if (inGameWaithing) {
      throw new Error('Вы находитесь в другой заявке')
    }

    // 2. не находится в игре
    const inGame = await GamePlayer.findOne({
      where: {
        accountId: user.id,
        status: [
          GamePlayer.playerStatuses.IN_GAME,
          GamePlayer.playerStatuses.FREEZED,
        ],
      },
    })

    if (inGame) {
      throw new Error('Вы находитесь в игре')
    }

    // 3. Проверяю, есть ли запрет на игры
    const hasPlayPunish = await Punishment.findOne({
      where: {
        accountId: user.id,
        type: Punishment.types.NO_PLAYING,
        untilAt: {
          [Op.gte]: new Date().toISOString(),
        },
      },
    })

    if (hasPlayPunish) {
      throw new Error(
        `У вас действет запрет на участие в играх до ${getCoolDateTime(
          hasPlayPunish.untilAt
        )}`
      )
    }

    // Проверяю являются ли выбранные типы игр активными
    for (const index in contests) {
      const con = await Contest.findByPk(contests[index])
      if (!con || !con.active) {
        throw new Error(
          'Один или несколько выбранных типов не активны в данный момент'
        )
      }
    }

    // Сохраняю в базу выбранные типы игр
    for (const index in contests) {
      await ContestPlayer.create({
        accountId: user.id,
        contestId: contests[index],
      })
    }

    // Обновляю количество ожидающих сорева
    const concount = await ContestPlayer.concount()
    this.io.of('/lobbi').emit('update.concount', concount)
  }

  // Покинуть очередь соревновательного реима
  async leaveContest() {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    // Удаляю заявки из очереди
    await ContestPlayer.destroy({
      where: {
        accountId: user.id,
      },
    })

    // Обновляю количество ожидающих сорева
    const concount = await ContestPlayer.concount()
    this.io.of('/lobbi').emit('update.concount', concount)
  }

  // Проверка ролей на корректность
  _checkRoles(roles) {
    // Наличие мафии
    const mafia = roles.filter((role) => role[0] == Game.roles.MAFIA)
    if (mafia.length != 1) {
      throw new Error('В списке ролей должна быть мафия')
    }
    if (mafia[0][1] < 1) {
      throw new Error('В партии должен быть хотя бы один мафиози')
    }
    if (mafia[0][1] > 4) {
      throw new Error('В партии не может быть больше 4 мафиози')
    }

    const komissar = roles.filter((role) => role[0] == Game.roles.KOMISSAR)
    if (komissar.length > 1) {
      throw new Error('В партии может быть только один комиссар')
    }
    if (komissar.length > 0 && komissar[0][1] != 1) {
      throw new Error('В партии может быть только один комиссар')
    }

    const sergeant = roles.filter((role) => role[0] == Game.roles.SERGEANT)
    if (sergeant.length > 1) {
      throw new Error('В партии может быть только один сержант')
    }
    if (sergeant.length > 0 && sergeant[0][1] != 1) {
      throw new Error('В партии может быть только один сержант')
    }
    if (sergeant.length == 1) {
      if (komissar.length == 0) {
        throw new Error('Сержант не может быть в партии без комиссара')
      }
    }

    const doctor = roles.filter((role) => role[0] == Game.roles.DOCTOR)
    if (doctor.length > 1) {
      throw new Error('В партии может быть только один доктор')
    }
    if (doctor.length > 0 && doctor[0][1] != 1) {
      throw new Error('В партии может быть только один доктор')
    }

    const maniac = roles.filter((role) => role[0] == Game.roles.MANIAC)
    if (maniac.length > 0) {
      if (maniac[0][1] < 0) {
        throw new Error('Неверный формат ролей')
      }
      if (maniac[0][1] > 4) {
        throw new Error('В партии не может быть больше 4 маньяков')
      }
    }

    const child = roles.filter((role) => role[0] == Game.roles.CHILD)
    if (child.length > 1) {
      throw new Error('В партии может быть только одино дитя')
    }
    if (child.length > 0 && child[0][1] != 1) {
      throw new Error('В партии может быть только одино дитя')
    }

    const advocate = roles.filter((role) => role[0] == Game.roles.ADVOCATE)
    if (advocate.length > 1) {
      throw new Error('В партии может быть только один адвокат')
    }
    if (advocate.length > 0 && advocate[0][1] != 1) {
      throw new Error('В партии может быть только один адвокат')
    }

    const lover = roles.filter((role) => role[0] == Game.roles.LOVER)
    if (lover.length > 1) {
      throw new Error('В партии может быть только одина любовница')
    }
    if (lover.length > 0 && lover[0][1] != 1) {
      throw new Error('В партии может быть только одина любовница')
    }

    // Других ролей быть не должно
    const others = roles.filter((role) => role[0] > Game.roles.LOVER)
    if (others.length != 0) {
      throw new Error('Неизвестная роль')
    }
  }

  // Присоединиться к заявке
  async toGame(gameId) {
    const { socket } = this
    const { account } = socket
    if (!account) {
      throw new Error('Не авторизован')
    }

    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    // Проверка, есть ли игра
    const game = await Game.scope('def').findByPk(gameId)

    if (!game) {
      throw new Error('Заявка не найдена')
    }

    if (game.status != Game.statuses.WHAITNG) {
      throw new Error('К этой заявке уже нельзя присоединиться')
    }

    if (game.playersCount == game.players.length) {
      throw new Error('В заявке нет свободных мест')
    }

    // Проверяю, есть ли запрет на игры
    const hasPunish = await Punishment.findOne({
      where: {
        accountId: account.id,
        type: Punishment.types.NO_PLAYING,
        untilAt: {
          [Op.gte]: new Date().toISOString(),
        },
      },
    })

    if (hasPunish) {
      throw new Error(
        `У вас действет запрет на участие в играх до ${getCoolDateTime(
          hasPunish.untilAt
        )}`
      )
    }

    // Проверяю, был ли игрок удалён из этой заявки
    const wasRemoved = await GamePlayer.count({
      where: {
        gameId,
        accountId: account.id,
        status: GamePlayer.playerStatuses.DROPPED,
      },
    })

    if (wasRemoved) {
      throw new Error('Вы были удалёны из этой заявки')
    }

    // Если создатель заявки имеет vip-статус
    if (game.account.vip) {
      // Проверяю, не находится ли текущий игрок у него в чс

      const acc = await Account.findOne({
        where: { username: game.account.username },
      })

      const isBlocked = await Friend.findOne({
        where: {
          status: -2,
          accountId: acc.id,
          friendId: account.id,
        },
      })

      if (isBlocked) {
        throw new Error('Вы в ЧС у создателя заявки')
      }
    }

    // Проверяю находится ли игрок в другой заявке
    const inGame = await GamePlayer.count({
      where: {
        accountId: account.id,
        status: [
          GamePlayer.playerStatuses.WHAITNG,
          GamePlayer.playerStatuses.IN_GAME,
          GamePlayer.playerStatuses.FREEZED,
        ],
      },
    })

    if (inGame) {
      throw new Error('Вы всё ещё в другой заявке')
    }

    // Добавляю игрока в заявку
    await GamePlayer.create({
      gameId,
      accountId: account.id,
      username: account.username,
    })

    // Отправляю всем информацию об игроке зашедшем в зявку
    const { io } = this
    io.of('/lobbi').emit('game.player.add', gameId, {
      username: account.username,
      avatar: account.avatar,
      online: true,
    })

    // Если набралось требуемое количество игроков
    if (game.playersCount == game.players.length + 1) {
      // Беру игру
      try {
        // Инициирую запуск игры
        GamesManager.start(io, GamesManager.whatingGames[gameId])
      } catch (error) {
        log(error)
        throw new Error(error.message)
      }
    }
  }

  // Удление заявки владельцем
  async removeGame(gameId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    // Проверка, есть ли игра
    const game = await Game.findByPk(gameId)

    if (!game) {
      throw new Error('Заявка не найдена')
    }

    if (game.accountId != user.id) {
      throw new Error('Нельзя удалять чужую заявку')

      // (админу надо разрешить!)
    }

    if (game.status != Game.statuses.WHAITNG) {
      throw new Error('Эту заявку нельзя удалить')
    }

    // Ищу игрока в этой заявке
    const playerInGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: user.id,
        status: GamePlayer.playerStatuses.WHAITNG,
      },
      include: [
        {
          model: Account,
          attributes: ['username'],
        },
      ],
    })

    if (!playerInGame) {
      throw new Error('Вас нет в этой заявке')
    }

    // Если всё ок - удаляю заявку
    await GamesManager.remove(this.io, game)
  }

  // Покинуть заявку
  async leaveGame(gameId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    // Проверка, есть ли заявка
    const game = await Game.scope('def').findByPk(gameId)

    if (!game) {
      throw new Error('Заявка не найдена')
    }

    if (game.status != Game.statuses.WHAITNG) {
      throw new Error('Эту заявку нельзя покинуть')
    }

    // Ищу игрока в этой заявке
    const playerInGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: user.id,
        status: GamePlayer.playerStatuses.WHAITNG,
      },
      include: [
        {
          model: Account,
          attributes: ['username'],
        },
      ],
    })

    if (!playerInGame) {
      throw new Error('Вас нет в этой заявке')
    }

    // Если других игроков в заявке не осталось - удаляю её
    if (game.players.length == 1) {
      await GamesManager.remove(this.io, game)
      return
    }

    // Ставлю статус игрока - 1 (не в заявке)
    playerInGame.status = GamePlayer.playerStatuses.LEAVE
    await playerInGame.save()

    // Отправляю всем информацию что игрок покинул заявку
    this.io
      .of('/lobbi')
      .emit('game.player.leave', gameId, playerInGame.account.username)
  }

  // Удалить из заявки игрока
  async removePlayerFromGame(gameId, username) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    // Проверка, есть ли заявка
    const game = await Game.scope('def').findByPk(gameId)

    if (!game) {
      throw new Error('Заявка не найдена')
    }

    if (game.status != Game.statuses.WHAITNG) {
      throw new Error('Из этой заявки уже нельзя удалить игрока')
    }

    const userAccount = await Account.findByPk(user.id)

    if (!userAccount.vip) {
      throw new Error(
        'Удалять игроков из заявки могут только игроки c vip-статусом'
      )
    }

    if (game.account.username != userAccount.username) {
      throw new Error('Удалить игрока можно только из своей заявки')
    }

    // Ищу игрока в этой заявке
    const inGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: user.id,
        status: GamePlayer.playerStatuses.WHAITNG,
      },
      include: [
        {
          model: Account,
          attributes: ['username'],
        },
      ],
    })

    if (!inGame) {
      throw new Error('Удалить игрока можно только находясь в заявке')
    }

    const account = await Account.findOne({ where: { username } })

    if (!account) {
      throw new Error('Игрок не найден')
    }

    // Ищу в заявке игрока, которого надо дропнуть
    const playerInGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: account.id,
        status: GamePlayer.playerStatuses.WHAITNG,
      },
    })

    if (!playerInGame) {
      throw new Error('Игрока нет в этой заявке')
    }

    // Если в заявке остался только один игрок - удаляю её
    if (game.players.length == 1) {
      await GamesManager.remove(this.io, game)
      return
    }

    // Ставлю статус игрока - удалён из заявки
    playerInGame.status = GamePlayer.playerStatuses.DROPPED
    await playerInGame.save()

    // Отправляю всем информацию что игрок покинул заявку
    const { io } = this
    io.of('/lobbi').emit('game.player.leave', gameId, username)
  }

  // Жалоба
  async claim(data) {
    const { username, type, comment } = data

    if (!type || !username) {
      throw new Error('Нет необходимых данных')
    }

    const { account } = this.socket

    if (!account) {
      throw new Error('Не авторизован')
    }

    if (type < 1 || type > 3) {
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

    // Если у пользователя уже есть мут, то выходим
    const hasPunishment = await Punishment.findOne({
      where: {
        accountId: player.id,
        type: Punishment.types.MUTE,
        untilAt: {
          [Op.gte]: new Date().toISOString(),
        },
      },
    })

    if (hasPunishment) {
      throw new Error('Пользователь уже получил мут')
    }

    const claimData = {
      accountId: account.id,
      playerId: player.id,
      type,
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

    // Получаю жалобы на игрока за 5-ти минутный промежуток
    const around5minute = new Date(Date.now() - 1000 * 60 * 5).toISOString()
    const claims = await Claim.findAll({
      where: {
        playerId: player.id,
        type,
        createdAt: {
          [Op.gt]: around5minute,
        },
      },
    })

    // достигнут лимит жалоб
    if (claims.length == Claim.limit(type)) {
      // Создаю наказание
      const punish = await this._makePunishment(
        player,
        type,
        'Мут по результатам самоконтроля'
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
      type: Punishment.types.MUTE,
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

    // Перегружаю открытые сокеты наказанного игрока
    const socks = this.getUserSockets(player.id, '/lobbi')
    socks.forEach((s) => s.emit('reload'))

    const date = getCoolDateTime(until)

    const reason = Claim.reason(type)
    const message = `Вам запрещено писать в чате лобби до ${date} по причине: ${reason}`

    const sysmsg = await Chat.sysMessage(
      `[${player.username}] запрещается писать в этот чат до ${date} за ${reason}.`
    )

    // Рассылаю сообщение всем подключенным пользователям
    this.io.of('/lobbi').emit('chat.message', sysmsg)

    // Уведомляю нарушителя
    await this.notify(player.id, message, 2)

    return punish
  }

  // Запуск игры
  async startGame(gameId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    // Проверка, есть ли заявка
    const game = await Game.scope('def').findByPk(gameId)

    if (!game) {
      throw new Error('Заявка не найдена')
    }

    if (game.status != Game.statuses.WHAITNG) {
      throw new Error('Эту игру нельзя запустить')
    }

    const userAccount = await Account.findByPk(user.id)

    if (!userAccount.vip) {
      throw new Error(
        'Запустить партию раньше срока могут только игроки c vip-статусом'
      )
    }

    if (game.players.length < minCount) {
      throw new Error(
        `Минимальное количество игроков для запуска игры - ${minCount}`
      )
    }

    if (game.gametypeId == 5) {
      const gameRoles = await GameInitRole.findAll({
        where: { gameId: game.id },
      })
      const cnt = gameRoles.reduce((a, { cnt }) => a + cnt, 0)

      if (game.players.length < cnt) {
        throw new Error(
          `Минимальное количество игроков для запуска игры - ${cnt}`
        )
      }
    }

    // Запускаю игру
    GamesManager.whatingGames[game.id].deadline = 0
  }
}

module.exports = LobbiService
