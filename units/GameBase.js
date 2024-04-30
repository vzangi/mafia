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
const log = require('./customLog')
const Friend = require('../models/Friend')
const ThingType = require('../models/ThingType')
const GameEvent = require('../models/GameEvent')
const AccountSetting = require('../models/AccountSetting')

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
    this.periodInterval = 120

    // время перехода для комиссара
    this.perehodInterval = 3

    // Игроки пишущие в чате
    // Ключами являются ники игроков
    // Значениями по ключу - id таймера сброса печати
    this.typingUsers = {}

    // Флудящие игроки
    this.flooders = {}
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

      let gameTypeMsg = ''
      if (game.competition) gameTypeMsg += 'Соревновательный режим. '

      // Классика или мульти
      if (
        game.gametypeId == Game.types.CLASSIC ||
        game.gametypeId == Game.types.MULTI ||
        game.gametypeId == Game.types.CONSTRUCTOR
      ) {
        if (game.gametypeId == Game.types.CLASSIC)
          gameTypeMsg += 'Классическая игра'
        if (game.gametypeId == Game.types.MULTI)
          gameTypeMsg += 'Мультиролевая игра'
        if (game.gametypeId == Game.types.CONSTRUCTOR)
          gameTypeMsg += 'Конструктор'
        if (game.mode == 1)
          gameTypeMsg += ` «По большинству голосов»  (без добивов)`
        if (game.mode == 2)
          gameTypeMsg += ` «По количеству голосов»  (с добивами)`
      }

      // Перестрелка
      if (game.gametypeId == Game.types.SHOOTOUT) {
        gameTypeMsg += 'Перестрелка'
        if (game.mode == 1) gameTypeMsg += ' в режиме «По большинству голосов»'
        if (game.mode == 2) gameTypeMsg += ' в режиме «Ожидание всех голосов»'
      }
      await this.systemMessage(gameTypeMsg)
      this.systemLog(gameTypeMsg)

      if (!game.firstday) {
        await this.systemMessage('Пропуск голосования первого дня.')
        this.systemLog('Пропуск голосования первого дня.')
      }

      const inGameStr = this.players.map((p) => p.username).join(', ')

      await this.systemMessage(`В игре участвуют <b>${inGameStr}</b>.`)
      this.systemLog(`В игре участвуют <b>${inGameStr}</b>.`)

      const names = await this.getRoleNames()
      await this.systemMessage(`Раздаём роли: ${names}.`)
      this.systemLog(`Раздаём роли: ${names}.`)

      await this.systemMessage(`Дадим мафии время договориться.`)
      this.systemLog(`Дадим мафии время договориться.`)
    }

    if (game.status == Game.statuses.STARTED) {
      // Если интервал не был запущен (может быть при рестарте сервера)
      if (!this.workerIntervalId) {
        // То запускаем воркер
        this.startPeriodWorker()
      }

      // Запуск воркера контролирующего вышедших по тайму игроков
      this.timeoutIntervalId = setInterval(
        this.timeoutWorker.bind(this),
        (this.periodInterval + 5) * 1000
      )
    } else {
      this.removeGame()
    }
  }

  // Планирование запуска воркера
  startPeriodWorker() {
    // Запуск воркера контролирующего дедлайны периодов
    this.workerIntervalId = setTimeout(
      this.periodWorker.bind(this),
      workerInterval
    )
  }

  async getRoleNames() {
    const roles = await this.getAvailableRoles()
    const names = []
    let rolesCount = 0
    for (const index in roles) {
      const name = await Role.findByPk(roles[index][0])
      if (!name) {
        log('Не найдена роль' + roles[index][0])
        continue
      }
      names.push([name.name, roles[index][1]])
      rolesCount += roles[index][1]
    }

    const playersCount = this.players.length
    if (rolesCount < playersCount) {
      // Остальные честные
      const citizenRole = await Role.findByPk(Game.roles.CITIZEN)
      names.push([citizenRole.name, playersCount - rolesCount])
    }

    return names.map((n) => `<b>${n[0]}</b> x ${n[1]}`).join(', ')
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

      const msg = `${role.name} <b>${player.username}</b> ${
        playerInBase.gender == Account.genders.FEMALE
          ? 'вышла'
          : playerInBase.gender == Account.genders.MALE
          ? 'вышел'
          : 'вышел(ла)'
      } из партии по таймауту`

      this.systemMessage(msg)

      this.systemLog(msg)

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
      await this.gameOver(winnerSide)
    }
  }

  // Нотификация игрокам о начале игры
  async notify() {
    const { io, players, game } = this

    for (const index in players) {
      const player = players[index]

      // Сообщаю игроку в лобби о начале партии
      const ids = this.getUserSocketIds(player.accountId, '/lobbi')
      ids.forEach((sid) => sid.emit('game.play', game.id))

      // Сообщаю друзьям что игрок в партии
      this._notifyFriends(player)

      // Узнаю статус настройки
      const startNotify = await AccountSetting.findOne({
        where: {
          accountId: player.accountId,
          type: AccountSetting.settingTypes.GAME_START_NOTIFY,
        },
      })

      // Флаг необходимости нотификации
      const needNotify = !startNotify || startNotify.value == 1

      // Если игрока нет в лобби или оповещение включено
      if (needNotify || ids.length == 0) {
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
    }

    // Сообщаю всем в лобби о запуске игры
    io.of('/lobbi').emit('game.start', game.id)
  }

  // Нотификация друзьям о том что игрок в партии
  async _notifyFriends(player, event = 'friend.ingame') {
    // Беру список друзей
    const friends = await Friend.scope({
      method: ['friends', player.accountId],
    }).findAll()

    friends.forEach((f) => {
      const { friend } = f

      // Если друг онлайн
      if (friend.online) {
        const friendIds = this.getUserSocketIds(friend.id, '/')
        friendIds.forEach((soc) => {
          soc.emit(event, player.accountId, this.game.id)
        })
      }
    })
  }

  // Получение сокетов игрока
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
      log(error)
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
      log(error)
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

  // Переход после хода мафии
  async transition() {
    const { room, perehodInterval } = this

    // Завершаю ход мафии
    room.emit('mafia.stop')

    await this.systemMessage('<hr>')
    await this.systemMessage('Внимание! Считаем трупы на рассвете.')

    this.systemLog('<hr>Внимание! Считаем трупы на рассвете.')

    // даю 3 секунды после ночи на переход
    await this.setPeriod(Game.periods.TRANSITION, perehodInterval)
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

    if (game.period == Game.periods.END) {
      clearInterval(this.workerIntervalId)
      clearInterval(this.timeoutIntervalId)
      return
    }

    const date = new Date()

    // Проверяю истёк ли дедлайн
    if (game.deadline < date) {
      // Перехожу к следующему периоду
      await this.nextPeriod()
    } else {
      // Продолжаю обработку воркера
      this.startPeriodWorker()
    }
  }

  // Установка следующего периода
  async setPeriod(period, seconds) {
    const { game, room } = this
    game.period = period
    game.deadline = deadlineAfter(Math.floor(seconds / 60), seconds % 60)
    await game.save()

    //Запускаю воркер
    this.startPeriodWorker()

    // Уведомляю игроков о дедлайне следующего периода
    room.emit('deadline', seconds, period)
  }

  // Показывает роль выбывшего игрока
  async showPlayerRole(player, status) {
    const { room } = this
    const role = await player.getRole()

    await this, this._notifyFriends(player, 'friend.leavegame')

    room.emit('role.show', {
      role: role,
      username: player.username,
      status,
    })
  }

  async vote(username, voterId) {
    const voter = this.getPlayerById(voterId)

    if (!voter) {
      throw new Error('Вас нет в этой игре')
    }

    // Если игрока отвлекает любовница
    if (voter.status == GamePlayer.playerStatuses.FREEZED) {
      throw new Error(
        'Любовница заманила вас в свои сети и не даёт возможности проголосовать'
      )
    }

    // Игрок должен иметь активный статус (в игре)
    if (voter.status != GamePlayer.playerStatuses.IN_GAME) {
      return
      //throw new Error('Вы не можете голосовать в этой игре')
    }

    const player = this.getPlayerByName(username)

    if (!player) {
      throw new Error('Игрок не найден в этой игре')
    }

    if (
      player.status != GamePlayer.playerStatuses.IN_GAME &&
      player.status != GamePlayer.playerStatuses.FREEZED
    ) {
      throw new Error('Нельзя голосовать в выбывшего игрока')
    }

    const { game, room } = this
    const { period, day } = game

    if (period != Game.periods.DAY) {
      throw new Error('Голосование окончено')
    }

    // Ищу свой голос в этот день
    const haveVote = await GameStep.findOne({
      where: {
        gameId: game.id,
        accountId: voterId,
        day: day,
        stepType: GameStep.stepTypes.DAY,
      },
    })

    // Если уже голосовал
    if (haveVote) {
      throw new Error('Вы уже проголосовали')
    }

    // Записываю голос в базу
    await GameStep.create({
      gameId: game.id,
      accountId: voterId,
      playerId: player.accountId,
      day: day,
      stepType: GameStep.stepTypes.DAY,
    })

    const voteMsg = `<b><span class='user voter'>${voter.username}</span> хочет отправить в тюрьму <span class='user pretendent'>${username}</span></b>`

    await this.systemMessage(voteMsg)
    this.systemLog(voteMsg, GameLog.types.STEP)

    // Уведомляю всех о голосе
    room.emit('vote', voter.username, username)

    // Проверяю, можно ли завершать голосование
    const votesEnded = await this.haveZek()

    if (votesEnded) game.deadline = 0
  }

  // Проверяю, определился ли игрок, которого можно посадить
  async haveZek() {
    const { game } = this

    // Количесвто активных игроков
    const activePlayers = this.activePlayersCount()

    // Количество голосов
    const votesCount = await GameStep.count({
      where: {
        gameId: game.id,
        day: game.day,
        stepType: GameStep.stepTypes.DAY,
      },
    })

    if (activePlayers == votesCount) return true

    // Беру игроков с максимальным количеством голосов
    const { maxVotes, prevVotes } = await GameStep.maxVotes(game)

    // Если равенство голосов, то посадка не определена
    if (maxVotes == prevVotes) return false

    // Количество не отданных голосов
    const freeVotes = activePlayers - votesCount

    // Если игрока с максимальным количеством уже нельзя сровнять, то посадка найдена
    if (maxVotes - freeVotes > prevVotes) return true

    return false
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

    if (role == Game.roles.MAFIA) {
      // Событие - ком нашёл мафа
      await this.makeAction(
        [Game.roles.KOMISSAR],
        GameEvent.actionEvents.KOM_FIND_MAF
      )
    }

    // Событие - факт первой проверки
    await this.makeFirstFact(player.accountId, GameEvent.factEvents.FIRST_CHECK)

    // перехожу к следующему периоду
    game.deadline = 0
  }

  // Проверка на окончание игры
  async isOver() {
    const { players } = this

    let aliveMafia = 0
    let aliveOtherMafia = 0
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

        // Роль адвоката или любовницы
        if (
          player.roleId == Game.roles.ADVOCATE ||
          player.roleId == Game.roles.LOVER
        ) {
          aliveOtherMafia += 1
          continue
        }

        // Здесь все чижовые роли
        aliveCitizens += 1
      }
    }

    // Ничья
    if (
      aliveMafia == 0 &&
      aliveCitizens == 0 &&
      aliveManiac == 0 &&
      aliveOtherMafia == 0
    ) {
      return Game.sides.DRAW
    }

    // Победа маньяка
    if (
      aliveMafia == 0 &&
      aliveCitizens == 0 &&
      aliveManiac >= 1 &&
      aliveOtherMafia == 0
    ) {
      return Game.sides.MANIAC
    }

    // Победа мафии
    if (
      aliveMafia + aliveOtherMafia > 0 &&
      aliveCitizens == 0 &&
      aliveManiac == 0
    ) {
      return Game.sides.MAFIA
    }

    // Победа города
    if (aliveMafia == 0 && aliveCitizens > 0) {
      return Game.sides.CITIZENS
    }

    // Игра продолжается
    return null
  }

  // Игра окончена
  async gameOver(side) {
    const { game, room, players } = this

    // Завершаю обработку периодов
    await this.setPeriod(Game.periods.END, 0)

    // Если игра уже была завершена
    if (game.status == Game.statuses.ENDED) return

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

    if (side == Game.sides.DRAW) {
      this.systemMessage('Игра окончена. Ничья.')
      this.systemLog('<hr>Игра окончена. Ничья.')
    }

    if (side == Game.sides.CITIZENS) {
      this.systemMessage('Игра окончена. Честные жители победили.')
      this.systemLog('<hr>Игра окончена. Честные жители победили.')
    }

    if (side == Game.sides.MAFIA) {
      this.systemMessage('Игра окончена. Мафия победила.')
      this.systemLog('<hr>Игра окончена. Мафия победила.')
    }

    if (side == Game.sides.MANIAC) {
      this.systemMessage('Игра окончена. Маньяк победил.')
      this.systemLog('<hr>Игра окончена. Маньяк победил.')
    }

    // Запуск процесса раздачи подарков победившей стороне ...
    await this.prizes(side)

    // Если сорев - рассчитываю ранги
    if (game.competition && side != Game.sides.DRAW) {
      await this.rankUp()
    }

    // Если не конструктор
    if (game.gametypeId != Game.types.CONSTRUCTOR) {
      // Событие - Результат игры
      const event = {
        gameId: game.id,
        type: GameEvent.eventTypes.RESULT,
      }

      // Выставляю каждому игроку результат
      for (const index in players) {
        const player = players[index]

        event.accountId = player.accountId

        if (side == Game.sides.DRAW) {
          event.value = GameEvent.resultEvents.DRAW
        } else {
          // Если вышел по тайму
          if (player.status == GamePlayer.playerStatuses.TIMEOUT) {
            event.value = GameEvent.resultEvents.TIMEOUT
          } else {
            const role = await player.getRole()

            event.value =
              role.rolesideId == game.rolesideId
                ? GameEvent.resultEvents.WIN
                : GameEvent.resultEvents.LOOSE
          }
        }

        await GameEvent.create(event)
      }

      // Активирую события
      await GameEvent.update(
        {
          active: true,
        },
        {
          where: {
            gameId: game.id,
            active: false,
          },
        }
      )
    }

    room.emit('game.over', side)
  }

  // Пересчёт рангов
  async rankUp() {
    const { game, players } = this

    const bal = await GamePlayer.getGameRank(game)

    for (const index in players) {
      const player = players[index]

      const role = await player.getRole()

      // Флаг победитель/проигравший
      let npr = role.rolesideId == game.rolesideId ? 1 : -1

      // Если вышел по тайму
      if (player.status == GamePlayer.playerStatuses.TIMEOUT) {
        // Балл вычитается
        npr = -1
      }

      // Новый ранг
      let rank = player.account.rank + bal * npr

      // Учитываю ограничения ранга
      if (rank > 5000) rank = 5000
      if (rank < 0) rank = 0

      // Обновляю ранг
      await Account.update({ rank }, { where: { id: player.accountId } })

      // Событие - изменение ранга
      await GameEvent.create({
        gameId: game.id,
        accountId: player.accountId,
        type: GameEvent.eventTypes.COMPETITION,
        value: bal * npr,
      })

      if (npr > 0) {
        // Событие - повышение в топе недели
        await GameEvent.create({
          gameId: game.id,
          accountId: player.accountId,
          type: GameEvent.eventTypes.TOPWEEK,
          value: bal,
        })
      }
    }
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

      // Если не конструктор, то апаю лвл
      if (game.gametypeId != Game.types.CONSTRUCTOR) {
        await this.levelUp(player)
      }

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

  // Повышение лвл
  async levelUp(player) {
    const { game } = this
    let up = 0

    const account = await Account.findByPk(player.accountId)
    const startLevel = Account.getLevelByBorder(account.level)

    if (!account) {
      log(`Аккаунт ${player.accountId} не найден`)
      return
    }

    // Маньяк
    if (player.role.rolesideId == Game.sides.MANIAC) {
      // балл за каждый труп
      const killsCount = await GameStep.count({
        where: {
          gameId: game.id,
          accountId: account.id,
          stepType: GameStep.stepTypes.KILLING,
        },
      })

      // +2 за победу
      up = killsCount + 2
    }

    // Мафия
    if (player.role.rolesideId == Game.sides.MAFIA) {
      up = 4
    }

    // Честные жители
    if (player.role.rolesideId == Game.sides.CITIZENS) {
      up = 2

      if (player.role.id == Role.roles.KOMISSAR) {
        up += 1
      }

      if (player.role.id == Role.roles.SERGEANT) {
        up += 1
      }

      if (player.role.id == Role.roles.DOCTOR) {
        up += 1
      }
    }

    // Увеличиваю лвл
    account.level += up
    await account.save()

    // Проверяю достиг ли игрок нового лвл
    const endLevel = Account.getLevelByBorder(account.level)
    if (startLevel < endLevel) {
      // Поощрить значоком
      const rndBadge = await Thing.findOne({
        where: {
          thingtypeId: ThingType.thingTypes.BADGE,
          thingclassId: endLevel > 4 ? 4 : endLevel * 1 + 1,
        },
        order: [sequelize.random()],
      })

      if (!rndBadge) return

      // Дарю игроку
      await AccountThing.create({
        accountId: account.id,
        thingId: rndBadge.id,
      })

      // Уведомляю игрока о получении значка и нового уровня
      const message = `Вы получили ${rndBadge.name} за достижение ${endLevel}-го уровня!`
      const newNotify = await Notification.create({
        accountId: account.id,
        message,
        level: 0,
      })

      const ids = this.getUserSocketIds(account.id, '/')
      ids.forEach((sid) => {
        sid.emit('notify', {
          id: newNotify.id,
          message: newNotify.message,
          level: newNotify.level,
        })
      })
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
    if (rnd > 0.7) {
      thingtypeId = 1

      if (rnd > 0.79 && rnd < 0.8) {
        // Вещь второго класса
        thingclassId = 2
      }
    }

    // Приз - подарочный набор
    if (rnd > 0.8) {
      thingtypeId = 3
    }

    // Приз - ключ
    if (rnd > 0.9) {
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

    if (!winThing) return

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

  // Добавление события игры
  async makeAction(roles, value, inGameIgnore = false) {
    if (this.game.gametypeId == Game.types.CONSTRUCTOR) return

    // Событие
    const event = {
      gameId: this.game.id,
      type: GameEvent.eventTypes.ACTION,
      value,
      active: false,
    }

    // Игроки, которые инициировали событие
    const players = this.players.filter(
      (p) =>
        roles.indexOf(p.roleId) >= 0 &&
        (p.status == GamePlayer.playerStatuses.IN_GAME || inGameIgnore)
    )

    // Добавляю событие
    for (const index in players) {
      const player = players[index]
      event.accountId = player.accountId
      await GameEvent.create(event)
    }
  }

  // Добавление события первого факта игры
  async makeFirstFact(accountId, value) {
    if (this.game.gametypeId == Game.types.CONSTRUCTOR) return

    const hasFact = await GameEvent.findOne({
      where: {
        gameId: this.game.id,
        type: GameEvent.eventTypes.FACT,
        value,
      },
    })

    // Если такой факт уже был - выхожу
    if (hasFact) return

    // Создаю факт
    await this.makeFact(accountId, value)
  }

  // Добавление факта игры
  async makeFact(accountId, value) {
    if (this.game.gametypeId == Game.types.CONSTRUCTOR) return

    await GameEvent.create({
      gameId: this.game.id,
      accountId,
      type: GameEvent.eventTypes.FACT,
      value,
      active: false,
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
    const kom = this.getPlayerByRoleId(Game.roles.KOMISSAR)
    if (!kom) return null
    return kom.accountId
  }

  // Получение Id игрока определенной роли
  getPlayerByRoleId(roleId) {
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
    const serg = this.getPlayerByRoleId(Game.roles.SERGEANT)

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

  // Количество активных мафиози (которые ещё не выбыли из игры)
  liveOtherMafiaCount() {
    return this.players.filter(
      (p) =>
        p.status == GamePlayer.playerStatuses.IN_GAME &&
        (p.roleId == Game.roles.LOVER || p.roleId == Game.roles.ADVOCATE)
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

  // Мафии некого убивать
  noVictim() {
    const activePlayers = this.activePlayersCount()
    const mafiaCount = this.liveMafiaCount()
    if (activePlayers - mafiaCount == 1)
      if (this.getPlayerByRoleId(Game.roles.CHILD)) return true
    return false
  }

  /*  ==================================
      Игрок начал что-то печатать в чате
      ================================== */
  typingBegin(userId) {
    const { typingUsers, game } = this

    if (game.period == Game.periods.NIGHT) return

    // Беру игрока из списка участвующих в игре
    const player = this.getPlayerById(userId)

    // Если игрок не найден - выхожу
    if (!player) return

    // Если игрок заморожен - выхожу
    if (player.status == GamePlayer.playerStatuses.FREEZED) return

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

  // Блокировка флудера
  blockFlooder(accountId) {
    const { flooders } = this
    const blockTime = 10 * 1000
    const cnt = !flooders[accountId] ? 1 : flooders[accountId].cnt + 1

    flooders[accountId] = { cnt, time: new Date().getTime() + blockTime * cnt }
    return blockTime * cnt
  }

  // Проверка есть ли запрет из-за флуда
  isFlooder(accountId) {
    const { flooders } = this
    const flooder = flooders[accountId]
    if (!flooder) return false

    const currentTime = new Date().getTime()
    if (flooder.time < currentTime) return false

    return flooder.time - currentTime
  }

  // Остановка партии
  async stop() {
    const { game, players, room } = this
    game.status = Game.statuses.STOPPED
    game.period = Game.periods.END
    game.save()

    // Освобождаю игроков из партии и показываю их роли
    for (const index in players) {
      const player = players[index]
      if (
        player.status != GamePlayer.playerStatuses.IN_GAME &&
        player.status != GamePlayer.playerStatuses.FREEZED
      )
        continue
      player.status = GamePlayer.playerStatuses.STOPPED
      await player.save()
      await this.showPlayerRole(player, GamePlayer.playerStatuses.WON)
    }

    // Удаляю все статистические события игры
    await GameEvent.destroy({
      where: {
        gameId: game.id,
      },
    })

    const msg = 'Игра остановлена администратором.'
    await this.systemMessage('<hr>')
    await this.systemMessage(msg)
    this.systemLog('<hr>' + msg)

    room.emit('game.stop')
  }
}

module.exports = GameBase
