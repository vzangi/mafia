const Game = require('../models/Game')
const GameRole = require('../models/GameRole')
const GameChat = require('../models/GameChat')
const GamePlayer = require('../models/GamePlayer')
const { deadlineAfter, getCoolDateTime } = require('./helpers')
const workerInterval = 1000
const timeoutSeconds = 120
const GameStep = require('../models/GameStep')
const Account = require('../models/Account')
const bot = require('./bot')
const Role = require('../models/Role')
const Thing = require('../models/Thing')
const AccountThing = require('../models/AccountThing')
const sequelize = require('./db')
const Notification = require('../models/Notification')
const GameLog = require('../models/GameLog')

/*  ==================================
    Базовый класс для всех режимов игр
    ================================== */
class GameBase {
  constructor(io, game) {
    // Сама игра
    this.game = game

    this.io = io

    //Сокет комнаты
    this.room = io.of('/game').to(game.id)

    // Игроки
    this.players = []

    // время хода
    this.periodInterval = 20

    // время перехода для комиссара
    this.perehodInterval = 6

    // Мутекс для воркера
    this.workerMutex = true

    // Игроки пишущие в чате
    // Ключами являются ники игроков
    // Значениями по ключу - id таймера сброса печати
    this.typingUsers = {}
  }

  // Запуск игры
  async startGame() {
    const { game } = this

    // Загружаю список участников игры
    this.players = await GamePlayer.scope({
      method: ['ingame', game.id],
    }).findAll()

    // Если игра только запускается
    if (game.status == Game.statuses.WHAITNG) {
      // Подготавливаю игру к старту
      const prepared = await this.prepare()

      // Если подготовка не удалась - удалаяю заявку
      if (!prepared) {
        this.removeGame()
        return
      }

      // Ставлю статус - игра началась
      game.status = Game.statuses.STARTED

      // Запоминаю аремя начала игры
      game.startedAt = new Date().toISOString()

      // Начало игры / знакомство / нулевой день
      game.day = 0

      // Сохраняю изменения
      await game.save()

      // Даю две минуты на знакомство мафии
      await this.setPeriod(Game.periods.START, this.periodInterval)

      // Уведомляю игроков о начале игры
      this.notify()

      await this.systemMessage(
        `Игра началась ${getCoolDateTime(game.startedAt)}.`
      )
      this.systemLog(`Игра началась ${getCoolDateTime(game.startedAt)}.`)

      const inGameStr = this.players.map((p) => p.username).join(', ')

      await this.systemMessage(`В игре участвуют <b>${inGameStr}</b>.`)
      this.systemLog(`В игре участвуют <b>${inGameStr}</b>.`)

      if (game.mode == 1) {
        await this.systemMessage(
          'Режим игры "по большинству голосов" (без добивов)'
        )
        this.systemLog('Режим игры "по большинству голосов" (без добивов)')
      }
      if (game.mode == 2) {
        await this.systemMessage(
          'Режим игры "по количеству голосов" (с добивами)'
        )
        this.systemLog('Режим игры "по количеству голосов" (с добивами)')
      }

      await this.systemMessage(`Раздаём роли.`)
      this.systemLog(`Раздаём роли.`)

      await this.systemMessage(`Дадим мафии время договориться.`)
      this.systemLog(`Дадим мафии время договориться.`)
    }

    if (game.status == Game.statuses.STARTED) {
      // Запуск воркера контролирующего дедлайны периодов
      this.workerIntervalId = setInterval(
        this.periodWorker.bind(this),
        workerInterval
      )

      // Запуск воркера контролирующего вышедших по тайму игроков
      this.timeoutIntervalId = setInterval(
        this.timeoutWorker.bind(this),
        (this.periodInterval + 5) * 1000
      )
    } else {
      this.removeGame()
    }
  }

  // Воркер контролирующий вышедших по тайму игроков
  async timeoutWorker() {
    const { players } = this

    let komIsOut = false

    // Прохожу по каждому игроку
    for (let index = 0; index < players.length; index++) {
      const player = players[index]

      // если игрок не в игре - беру следующего
      if (
        player.status != GamePlayer.playerStatuses.IN_GAME &&
        player.status != GamePlayer.playerStatuses.FREEZED
      )
        continue

      const playerInBase = await Account.findOne({
        where: {
          id: player.accountId,
        },
        attibutes: ['online', 'updatedAt', 'gender'],
      })

      if (!playerInBase) continue

      if (playerInBase.online) continue

      const seconds = Math.floor(
        (Date.now() * 1) / 1000 - (new Date(playerInBase.updatedAt) * 1) / 1000
      )

      if (seconds < timeoutSeconds) continue

      player.status = GamePlayer.playerStatuses.TIMEOUT
      await player.save()

      const role = await player.getRole()

      if (player.roleId == Game.roles.KOMISSAR) {
        komIsOut = true
      }

      this.systemMessage(
        `${role.name} <b>${player.username}</b> ${
          playerInBase.gender == 2 ? 'вышла' : 'вышел'
        } из партии по таймауту`
      )

      await this.showPlayerRole(player, GamePlayer.playerStatuses.TIMEOUT)
    }

    // Если комиссар вышел в тайм
    if (komIsOut) {
      // Передаю роль кома сержанту
      await this.updateSergeant()
    }

    // Проверка на завершение игры
    const winnerSide = await this.isOver()
    if (winnerSide) {
      return await this.gameOver(winnerSide)
    }
  }

  // Нотификация игрокам о начале игры
  async notify() {
    const { io, players, game } = this
    players.forEach((player) => {
      const ids = this.getUserSocketIds(player.accountId, '/lobbi')
      ids.forEach((sid) => {
        sid.emit('game.play', game.id)
      })

      // Если игрока нет в лобби
      if (ids.length == 0) {
        // Отправляю нотификацию в телегу

        if (player.account.telegramChatId) {
          bot.sendMessage(
            player.account.telegramChatId,
            `<a href="${process.env.APP_HOST}/game/${game.id}">Игра началась!</a>`,
            {
              parse_mode: 'HTML',
            }
          )
        }
      }
    })

    io.of('/lobbi').emit('game.start', game.id)
  }

  getUserSocketIds(userId, nsp = '/game') {
    const { io } = this
    const ids = []
    try {
      // Проходимся по всем сокетам
      for (const [sid, s] of io.of(nsp).sockets) {
        // Если в сокете нет пользователя (он гость), то пропускаем его
        if (!s.user) continue
        // Если в каком-то из сокетов найден нужный игрок
        if (s.user.id == userId) {
          ids.push(s)
        }
      }
    } catch (error) {
      console.log(error)
    }
    return ids
  }

  // Подготовка к старту
  async prepare() {
    const { players } = this
    try {
      // Распределение ролей ...
      await this.takeRoles()

      // Знакомлю мафию и комов
      await this.meeting()

      // Для игроков в зявке ставлю статус "в игре"
      for (let index in players) {
        players[index].status = GamePlayer.playerStatuses.IN_GAME
        await players[index].save()
      }

      return true
    } catch (error) {
      console.log(error)
      return false
    }
  }

  // Распределение ролей ...
  async takeRoles() {
    const { players } = this
    const availableRoles = await this.getAvailableRoles()

    // Раздаю роли
    for (let k = 0; k < availableRoles.length; k++) {
      // Беру роль и количество игроков с ней
      const [roleId, cnt] = availableRoles[k]

      // Беру из заявки cnt случайных игроков без роли и ставлю им роль
      for (let index = 0; index < cnt; index++) {
        // Беру игроков из заявки которым ещё не назначена роль
        const noRolePlayers = players.filter((p) => !p.roleId)

        // Если всем игрокам разданы роли,
        // а в пулле ролей ещё есть неразданные - возвращаю ошибку
        if (noRolePlayers.length == 0) {
          throw new Error('Не удалось раздать роли')
        }

        // беру случайного игрока
        const randomPlayer =
          noRolePlayers[Math.floor(Math.random() * noRolePlayers.length)]

        // Выдаю ему роль
        randomPlayer.roleId = roleId
        await randomPlayer.save()
      }
    }

    // Оставшиеся без ролей игроки - чижи
    const citizens = players.filter((p) => !p.roleId)
    for (let index in citizens) {
      citizens[index].roleId = Game.roles.CITIZEN
      await citizens[index].save()
    }
  }

  // Знакомлю мафию и комов
  async meeting() {
    const { players, game } = this

    // Знакомлю мафию
    for (let index = 0; index < players.length; index++) {
      const player = players[index]

      if (player.roleId != Game.roles.MAFIA) continue

      for (let index2 = 0; index2 < players.length; index2++) {
        const player2 = players[index2]

        if (player2.roleId != Game.roles.MAFIA) continue
        if (player2.accountId == player.accountId) continue

        await GameRole.create({
          gameId: game.id,
          accountId: player.accountId,
          playerId: player2.accountId,
          roleId: Game.roles.MAFIA,
        })

        await GameRole.create({
          gameId: game.id,
          accountId: player2.accountId,
          playerId: player.accountId,
          roleId: Game.roles.MAFIA,
        })
      }
    }

    // Знакомлю кома и сержаната (если есть)
    for (let index = 0; index < players.length; index++) {
      const player = players[index]

      if (player.roleId != Game.roles.SERGEANT) continue

      for (let index2 = 0; index2 < players.length; index2++) {
        const player2 = players[index2]

        if (player2.roleId != Game.roles.KOMISSAR) continue
        // Ком видит сержанта
        await GameRole.create({
          gameId: game.id,
          accountId: player2.accountId,
          playerId: player.accountId,
          roleId: Game.roles.SERGEANT,
        })

        // Сержант видит кома
        await GameRole.create({
          gameId: game.id,
          accountId: player.accountId,
          playerId: player2.accountId,
          roleId: Game.roles.KOMISSAR,
        })
      }
    }

    // Показываю мафии дитя (если есть)
    for (let index = 0; index < players.length; index++) {
      const player = players[index]

      if (player.roleId != Game.roles.CHILD) continue
      for (let index2 = 0; index2 < players.length; index2++) {
        const player2 = players[index2]

        if (player2.roleId != Game.roles.MAFIA) continue

        // Мафия видит дитя
        await GameRole.create({
          gameId: game.id,
          accountId: player2.accountId,
          playerId: player.accountId,
          roleId: Game.roles.CHILD,
        })
      }
    }
  }

  // Удаление игры
  async removeGame() {
    const { game } = this

    // Освобождаю игроков из заявки
    await GamePlayer.update(
      {
        status: GamePlayer.playerStatuses.LEAVE,
      },
      {
        where: {
          gameId: game.id,
          status: [
            GamePlayer.playerStatuses.WHAITNG,
            GamePlayer.playerStatuses.IN_GAME,
          ],
        },
      }
    )

    // Ставлю статус - игра не началась
    game.status = Game.statuses.NOT_STARTED
    await game.save()
  }

  // Системное сообщение в игре
  async systemMessage(message) {
    const { game, room } = this
    // Сохраняю сообщение в базу
    const msg = await GameChat.newMessage(game.id, null, message, false, false)

    // И отправляю его всем кто подключён к просмотру игры
    room.emit('message', msg)
  }

  systemLog(message, type = 1, hidden = false) {
    const { game, room } = this

    GameLog.create({
      gameId: game.id,
      message,
      hidden,
      type,
    }).then((logItem) => {
      if (hidden) return
      room.emit('log', logItem)
    })
  }

  // Процедура проверки окончания дедлайна
  async periodWorker() {
    const { game } = this
    let { workerMutex } = this

    if (game.period == Game.periods.END) {
      clearInterval(this.workerIntervalId)
      clearInterval(this.timeoutIntervalId)
      return
    }

    // Если предыдущий период ещё не обработан - выходим из воркера
    if (!workerMutex) return

    const date = new Date()

    // Проверяю истёк ли дедлайн
    if (game.deadline < date) {
      // Ставлю на паузу воркер
      workerMutex = false

      // Перехожу к следующему периоду
      await this.nextPeriod()

      // Разрешаю воркеру продолжать работу
      workerMutex = true
    }
  }

  // Установка следующего периода
  async setPeriod(period, seconds) {
    const { game, room } = this
    game.period = period
    game.deadline = deadlineAfter(Math.floor(seconds / 60), seconds % 60)
    await game.save()

    // Уведомляю игроков о дедлайне следующего периода
    room.emit('deadline', seconds, period)
  }

  // Показывает роль выбывшего игрока
  async showPlayerRole(player, status) {
    const { room } = this
    const role = await player.getRole()
    room.emit('role.show', {
      role: role,
      username: player.username,
      status,
    })
  }

  // Выстрел
  async shot(username, mafId) {
    const { game, players } = this
    const player = this.getPlayerByName(username)

    if (!player) {
      throw new Error('Игрок не найден')
    }

    if (game.period != Game.periods.NIGHT) {
      throw new Error('Не время стрелять')
    }

    const maf = this.getPlayerById(mafId)

    if (!maf) {
      throw new Error('Маф не найден в этой игре')
    }

    if (maf.status != GamePlayer.playerStatuses.IN_GAME) {
      throw new Error('Вы уже выбыли из игры')
    }

    const { day } = game

    const isShooting = await GameStep.findOne({
      where: {
        gameId: game.id,
        day,
        accountId: mafId,
        stepType: GameStep.stepTypes.NIGHT,
      },
    })

    if (isShooting) {
      throw new Error('Вы уже стреляли этой ночью')
    }

    // Записываю выстрел в базу
    await GameStep.create({
      gameId: game.id,
      day,
      accountId: mafId,
      playerId: player.accountId,
      stepType: GameStep.stepTypes.NIGHT,
    })

    this.systemLog(
      `<b>Мафия ${maf.username} стреляет в ${username}</b>`,
      GameLog.types.MAF,
      true
    )

    // беру все выстрелы
    const shots = await GameStep.findAll({
      where: {
        gameId: game.id,
        day,
        stepType: GameStep.stepTypes.NIGHT,
      },
    })

    // Беру всех мафов, которые ещё в игре
    const mafiaPlayers = players.filter(
      (p) =>
        p.roleId == Game.roles.MAFIA &&
        p.status == GamePlayer.playerStatuses.IN_GAME
    )

    // Количество выстрелов равно количеству мафиози
    if (shots.length == mafiaPlayers.length) {
      // Завершаю ночь
      game.deadline = 0
    }
  }

  // Прова
  async prova(username, komId) {
    const player = this.getPlayerByName(username)
    if (!player) {
      throw new Error(`Игрок ${username} не найден`)
    }

    const { players, game } = this

    if (game.period != Game.periods.KOM) {
      throw new Error('Не время проверять')
    }

    if (komId != this.getKomId()) {
      throw new Error('Проверки может делать только комиссар')
    }

    if (
      player.status != GamePlayer.playerStatuses.IN_GAME &&
      player.status != GamePlayer.playerStatuses.FREEZED
    ) {
      throw new Error(`Игрок ${username} уже выбыл из игры`)
    }

    if (game.period != Game.periods.KOM) {
      throw new Error('Сейчас не ход кома')
    }

    const isProved = await GameStep.findOne({
      where: {
        gameId: game.id,
        accountId: komId,
        day: game.day,
        stepType: GameStep.stepTypes.CHECK,
      },
    })

    if (isProved) {
      throw new Error('Вы уже проверили игрока этой ночью')
    }

    // Записываю проверку в базу
    await GameStep.create({
      gameId: game.id,
      accountId: komId,
      playerId: player.accountId,
      day: game.day,
      stepType: GameStep.stepTypes.CHECK,
    })

    const komis = this.getPlayerById(komId)

    this.systemLog(
      `<b>Комиссар ${komis.username} проверил игрока ${username}</b>`,
      GameLog.types.KOM,
      true
    )

    const role = await player.getRole()

    // Беру комиссара и сержанта (если есть)
    const koms = players.filter(
      (p) => p.roleId == Game.roles.KOMISSAR || p.roleId == Game.roles.SERGEANT
    )

    for (const index in koms) {
      const kom = koms[index]

      // Записываю в базу роль игрока, которую они видят
      await GameRole.create({
        gameId: game.id,
        accountId: kom.accountId,
        playerId: player.accountId,
        roleId: player.roleId,
      })

      // Отправляю роль кому по сокету
      const ids = this.getUserSocketIds(kom.accountId)
      ids.forEach((sid) => {
        sid.emit('prova', {
          username,
          role,
        })
      })
    }

    // перехожу к следующему периоду
    game.deadline = 0
  }

  // Проверка на окончание игры
  async isOver() {
    const { players } = this

    let aliveMafia = 0
    let aliveCitizens = 0
    let aliveManiac = 0

    // Считаю какие роли ещё в игре
    for (let index = 0; index < players.length; index++) {
      const player = players[index]
      // Если игрок ещё в игре
      if (
        player.status == GamePlayer.playerStatuses.IN_GAME ||
        player.status == GamePlayer.playerStatuses.FREEZED
      ) {
        // Роль мафии
        if (player.roleId == Game.roles.MAFIA) {
          aliveMafia += 1
          continue
        }

        // Роль маньяка
        if (player.roleId == Game.roles.MANIAC) {
          aliveManiac += 1
          continue
        }

        // Здесь все остальные роли включая адвоката и проститутку (так как мафия не видит их ролей)
        aliveCitizens += 1
      }
    }

    // Ничья
    if (aliveCitizens == 0 && aliveMafia == 0 && aliveManiac == 0) {
      return Game.sides.DRAW
    }

    // Честные победили
    if (aliveCitizens > 0 && aliveMafia == 0) {
      return Game.sides.CITIZENS
    }

    // Победа мафии
    if (aliveCitizens == 0 && aliveMafia > 0) {
      return Game.sides.MAFIA
    }

    // Победа маньяка
    if (aliveManiac == 1 && aliveMafia == 0 && aliveCitizens == 0) {
      return Game.sides.MANIAC
    }

    // Игра продолжается
    return null
  }

  // Игра окончена
  async gameOver(side) {
    const { game, room, players } = this

    // Завершаю обработку периодов
    await this.setPeriod(Game.periods.END, 0)

    // Победившие игроки
    const winners = players.filter(
      (p) =>
        p.status == GamePlayer.playerStatuses.IN_GAME ||
        p.status == GamePlayer.playerStatuses.FREEZED
    )

    // Освобождаю победивших игроков из заявки и показываю их роли
    for (const index in winners) {
      const winner = winners[index]
      winner.status = GamePlayer.playerStatuses.WON
      await winner.save()
      await this.showPlayerRole(winner, GamePlayer.playerStatuses.WON)
    }

    // Ставлю статус - игра завершена
    game.status = Game.statuses.ENDED
    game.rolesideId = side
    await game.save()

    await this.systemMessage(`<hr>`)
    this.systemLog(`<hr>`)

    if (side == Game.sides.DRAW) {
      this.systemMessage('Игра окончена. Ничья.')
      this.systemLog('Игра окончена. Ничья.')
    }

    if (side == Game.sides.CITIZENS) {
      this.systemMessage('Игра окончена. Честные жители победили.')
      this.systemLog('Игра окончена. Честные жители победили.')
    }

    if (side == Game.sides.MAFIA) {
      this.systemMessage('Игра окончена. Мафия победила.')
      this.systemLog('Игра окончена. Мафия победила.')
    }

    if (side == Game.sides.MANIAC) {
      this.systemMessage('Игра окончена. Маньяк победил.')
      this.systemLog('Игра окончена. Маньяк победил.')
    }

    room.emit('game.over', side)

    // Запуск процесса раздачи подарков победившей стороне ...
    await this.prizes(side)
  }

  // Раздача призов
  async prizes(side) {
    if (side == Game.sides.DRAW) return

    const { players, game } = this

    // Значение шанса определяет с какой веротностью будут раздоваться призы
    // и зависит от количества игроков в партии
    let chanceToPriz = (players.length * 4) / 100

    // Если шанс больше случайного числа, то призы не раздаются
    //if (chanceToPriz < Math.random()) return

    // Беру игроков выигравшей стороны
    const winPLayers = await GamePlayer.findAll({
      where: {
        gameId: game.id,
      },
      include: {
        model: Role,
        where: {
          rolesideId: side,
        },
      },
    })

    // Смотрю каждого игрока
    for (const gpId in winPLayers) {
      const player = winPLayers[gpId]

      // Вышедшим в тайм игрокам призы не даю
      if (player.status == GamePlayer.playerStatuses.TIMEOUT) continue

      // Шанс для выбывшего игрока
      chanceToPriz = 0.25

      // Шанс для игрока оставшегося в игре
      if (player.status == GamePlayer.playerStatuses.WON) {
        chanceToPriz = 0.5
      }

      // Если шанс меньше случайной величины - игрок не получает приз
      if (chanceToPriz < Math.random()) continue

      // Выдаю приз
      await this.takePrize(player.accountId)
    }
  }

  // Дать приз игроку
  async takePrize(accountId) {
    const rnd = Math.random()

    // По умолчанию игрок получает кейс
    let thingtypeId = 4

    // Обчного класса
    let thingclassId = 1

    // Приз - кейс
    if (rnd > 0.5) {
      thingtypeId = 4
    }

    // Приз - вещь
    if (rnd > 0.8) {
      thingtypeId = 1

      if (rnd > 0.89 && rnd < 0.9) {
        // Вещь второго класса
        thingclassId = 2
      }
    }

    // Приз - подарочный набор
    if (rnd > 0.9) {
      thingtypeId = 3
    }

    // Приз - ключ
    if (rnd > 0.99) {
      thingtypeId = 5
    }

    // Беру приз
    const winThing = await Thing.findOne({
      where: {
        thingtypeId,
        thingclassId,
      },
      order: [sequelize.random()],
    })

    // Дарю игроку
    await AccountThing.create({
      accountId,
      thingId: winThing.id,
    })

    // Уведомить игрока о получении приза
    const message = `Вы получили приз за победу в партии: ${winThing.name}`
    const newNotify = await Notification.create({
      accountId,
      message,
      level: 0,
    })

    const ids = this.getUserSocketIds(accountId, '/')
    ids.forEach((sid) => {
      sid.emit('notify', {
        id: newNotify.id,
        message: newNotify.message,
        level: newNotify.level,
      })
    })
  }

  // Проверка на наличие кома в игре
  komInGame() {
    const { players } = this
    for (let index = 0; index < players.length; index++) {
      const { roleId, status } = players[index]
      if (
        roleId == Game.roles.KOMISSAR &&
        status == GamePlayer.playerStatuses.IN_GAME
      )
        return true
    }
    return false
  }

  // Получает Id кома или null, если его уже нет в игре
  getKomId() {
    const { players } = this
    for (const index in players) {
      const player = players[index]
      if (
        player.roleId == Game.roles.KOMISSAR &&
        player.status == GamePlayer.playerStatuses.IN_GAME
      )
        return player.accountId
    }
    return null
  }

  // Получает сержанта или null, если его нет в игре
  getSergeant() {
    const { players } = this
    for (const index in players) {
      const player = players[index]
      if (
        player.roleId == Game.roles.SERGEANT &&
        player.status == GamePlayer.playerStatuses.IN_GAME
      )
        return player
    }
    return null
  }

  hasRoleInGame(roleId) {
    const { players } = this
    for (const index in players) {
      const player = players[index]
      if (
        player.roleId == roleId &&
        (player.status == GamePlayer.playerStatuses.IN_GAME ||
          player.status == GamePlayer.playerStatuses.FREEZED)
      )
        return player
    }
    return null
  }

  // Проверка на наличие непроверенных игроков
  // для отпределения требуется ли хода кома
  async hasUnlookedPlayers() {
    const { players, game } = this
    const komId = this.getKomId()
    if (!komId) return false

    // игроки, роли которых ком видит
    const looked = await GameRole.findAll({
      where: {
        gameId: game.id,
        accountId: komId,
      },
    })

    // Прохожу по игрокам в партии
    for (const index in players) {
      const player = players[index]

      // Кома пропускаю
      if (player.accountId == komId) continue

      // Если игрок ещё в партии
      if (
        player.status == GamePlayer.playerStatuses.IN_GAME ||
        player.status == GamePlayer.playerStatuses.FREEZED
      ) {
        // Если игрок в списке проверенных комом - пропускаю
        if (looked.filter((p) => p.playerId == player.accountId).length == 1) {
          continue
        }

        // найден не проверенный игрок
        return true
      }
    }

    // непроверенных игроков нет
    return false
  }

  // Передача роли комиссара сержанту
  async updateSergeant() {
    const serg = this.getSergeant()

    if (!serg) return

    serg.roleId = Game.roles.KOMISSAR
    await serg.save()

    const role = await serg.getRole()

    this.systemMessage('Полномочия коммисара переходят сержанту.')
    this.systemLog('Полномочия коммисара переходят сержанту.')

    // Сообщаю сержанту о его новой роли
    const ids = this.getUserSocketIds(serg.accountId)
    ids.forEach((sid) => {
      sid.emit('role.update', {
        role,
      })
    })
  }

  // Количество активных игроков (которые ещё не выбыли из игры)
  activePlayersCount() {
    return this.players.filter(
      (p) =>
        p.status == GamePlayer.playerStatuses.IN_GAME ||
        p.status == GamePlayer.playerStatuses.FREEZED
    ).length
  }

  // Количество активных мафиози (которые ещё не выбыли из игры)
  liveMafiaCount() {
    return this.players.filter(
      (p) =>
        p.status == GamePlayer.playerStatuses.IN_GAME &&
        p.roleId == Game.roles.MAFIA
    ).length
  }

  // Получение id buh
  getId() {
    return this.game.id
  }

  // Получение игрока по id
  getPlayerById(id) {
    const player = this.players.filter((p) => {
      return p.accountId == id
    })
    if (player.length == 1) return player[0]
    return null
  }

  // Получение игрока по нику
  getPlayerByName(name) {
    const player = this.players.filter((p) => {
      return p.username == name
    })
    if (player.length == 1) return player[0]
    return null
  }

  /*  ==================================
      Игрок начал что-то печатать в чате
      ================================== */
  typingBegin(userId) {
    const { typingUsers } = this

    // Беру игрока из списка участвующих в игре
    const player = this.getPlayerById(userId)

    // Если игрок не найден - выхожу
    if (!player) return

    // Беру ник игррока
    const { username } = player

    // Если игрок был в списке печатающих
    if (typingUsers[username]) {
      // Очищаю предыдущий интервал удаляющий его оттуда
      clearTimeout(typingUsers[username])
    }

    // Ставлю таймер на удаление игрока из списка печатающих через 3 секунды
    typingUsers[username] = setTimeout(() => {
      this._cancelTyping(username)
    }, 3000)

    // Отправка списка печатающих игроков
    this.room.emit('typing', Object.keys(typingUsers))
  }

  /*  ==============================
      Игрок перестал печатать в чате
      ============================== */
  typingEnd(userId) {
    const { typingUsers } = this

    // Беру игрока из списка участвующих в игре
    const player = this.getPlayerById(userId)

    // Если игрок не найден - выхожу
    if (!player) return

    // Беру ник игррока
    const { username } = player

    // Если игрок был в списке печатающих
    if (typingUsers[username]) {
      // Очищаю предыдущий интервал удаляющий его оттуда
      clearTimeout(typingUsers[username])
    }

    this._cancelTyping(username)
  }

  /*  ====================================
      Удаление игрока из списка печатающих
      ==================================== */
  _cancelTyping(username) {
    const { typingUsers } = this

    // Если игрок был в списке печатающих
    if (typingUsers[username]) {
      // Удаляю его оттуда
      delete typingUsers[username]
    }

    // Отправка списка печатающих игроков
    this.room.emit('typing', Object.keys(typingUsers))
  }
}

module.exports = GameBase
