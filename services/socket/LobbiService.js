const htmlspecialchars = require('htmlspecialchars')
const Account = require('../../models/Account')
const Friend = require('../../models/Friend')
const Game = require('../../models/Game')
const GamePlayer = require('../../models/GamePlayer')
const GameInitRole = require('../../models/GameInitRole')
const minCount = 3
const GamesManager = require('../../units/GamesManager')
const BaseService = require('./BaseService')

class LobbiService extends BaseService {
  // Получение текущих заявок
  async getGames() {
    const games = await Game.scope('def').findAll()
    return games
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

    // 3. Нет запрета на создание заявки ...

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

    // Получаю новую заявку
    const game = await Game.scope('def').findByPk(newGame.id)

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

    // Добавляю её в список ожидающих заявок
    GamesManager.whatingGames[game.id] = game

    // Уведомляю подключённые сокеты о новой заявке
    const { socket } = this
    socket.broadcast.emit('game.new', game)

    // и возвращаю её
    return game
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
        console.log(error)
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
}

module.exports = LobbiService
