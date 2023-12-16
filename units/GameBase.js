const Game = require('../models/Game')
const GameRole = require('../models/GameRole')
const GameChat = require('../models/GameChat')
const GamePlayer = require('../models/GamePlayer')
const sequelize = require('./db')
const { deadlineAfter, getCoolDateTime } = require('./helpers')
const Role = require('../models/Role')
const workerInterval = 1000
const GamesManager = require('./GamesManager')
const Account = require('../models/Account')
const GameStep = require('../models/GameStep')

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
    const { game, room } = this

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
      this.setPeriod(Game.periods.START, this.periodInterval)

      // Уведомляю игроков о начале игры
      this.notify()

      await this.systemMessage(
        `Игра началась ${getCoolDateTime(game.startedAt)}.`
      )

      const inGameStr = this.players.map((p) => p.username).join(', ')

      await this.systemMessage(`В игре участвуют <b>${inGameStr}</b>.`)

      if (game.mode == 1) {
        await this.systemMessage(
          'Режим игры "по большинству" голосов (без добивов)'
        )
      }
      if (game.mode == 2) {
        await this.systemMessage(
          'Режим игры "по количеству" голосов (с добивами)'
        )
      }

      await this.systemMessage(`Раздаём роли.`)

      await this.systemMessage(`Дадим мафии время договориться.`)
    }

    if (game.status == Game.statuses.STARTED) {
      // Запуск воркера контролирующего дедлайны периодов
      this.workerIntervalId = setInterval(
        this.periodWorker.bind(this),
        workerInterval
      )
    } else {
      this.removeGame()
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

    console.log(`Доступные роли: `, availableRoles);

    // Раздаю роли
    for (let k = 0; k < availableRoles.length; k++) {
      // Беру роль и количество игроков с ней
      const [roleId, cnt] = availableRoles[k]

      console.log(`Раздаём роль ${cnt} роли ${roleId}`);

      // Беру из заявки cnt случайных игроков без роли и ставлю им роль
      for (let index = 0; index < cnt; index++) {
        // Беру игроков из заявки которым ещё не назначена роль
        const noRolePlayers = players.filter(p => !p.roleId)

        console.log(`Количество игроков без ролей: ${noRolePlayers.length}`);

        // Если всем игрокам разданы роли,
        // а в пулле ролей ещё есть неразданные - возвращаю ошибку
        if (noRolePlayers.length == 0) {
          throw new Error('Не удалось раздать роли')
        }

        // беру случайного игрока
        const randomPlayer = noRolePlayers[
          Math.floor(Math.random() * noRolePlayers.length)
        ]

        console.log(`Случайны игрко: ${randomPlayer.username}`);

        // Выдаю ему роль
        randomPlayer.roleId = roleId
        await randomPlayer.save()
      }
    }

    // Оставшиеся без ролей игроки - чижи
    const citizens = players.filter(p => !p.roleId)
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
          accountId: player.id,
          playerId: player2.id,
          roleId: Game.roles.MAFIA,
        })

        await GameRole.create({
          gameId: game.id,
          accountId: player2.id,
          playerId: player.id,
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

        if (player.roleId != Game.roles.KOMISSAR) continue

        // Ком видит сержанта
        await GameRole.create({
          gameId: game.id,
          accountId: player2.id,
          playerId: player.id,
          roleId: Game.roles.SERGEANT,
        })

        // Сержант видит кома
        await GameRole.create({
          gameId: game.id,
          accountId: player.id,
          playerId: player2.id,
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
          accountId: player2.id,
          playerId: player.id,
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

  // Процедура проверки окончания дедлайна
  async periodWorker() {
    const { game } = this
    let { workerMutex } = this

    if (game.period == Game.periods.END) {
      clearInterval(this.workerIntervalId)
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
    console.log('set period', period, seconds)
    const { game, room } = this
    game.period = period
    game.deadline = deadlineAfter(Math.floor(seconds / 60), seconds % 60)
    await game.save()

    // Уведомляю игроков о дедлайне следующего периода
    room.emit('deadline', seconds, period)
  }

  async showPlayerRole(player, status) {
    const { room } = this
    const role = await player.getRole()
    room.emit('role.show', {
      role: role,
      username: player.username,
      status,
    })
  }

  async prova(username) {
    const player = this.getPlayerByName(username)
    if (!player) {
      throw new Error(`Игрок ${username} не найден`)
    }

    if (player.status != GamePlayer.playerStatuses.IN_GAME || player.status != GamePlayer.playerStatuses.FREEZED) {
      throw new Error(`Игрок ${username} уже выбыл из игры`)
    }

    const { players, game } = this


    if (game.period != Game.periods.KOM) {
      throw new Error('Сейчас не ход кома')
    }

    const komId = this.getKomId()

    // Записываю проверку в базу
    await GameStep.create({
      gameId: game.id,
      accountId: komId,
      playerId: player.accountId,
      day: game.day,
      stepType: GameStep.stepTypes.CHECK
    })

    const role = await player.getRole()

    // Беру комиссара и сержанта (если есть)
    const koms = players.filter(p => p.roleId == Game.roles.KOMISSAR || p.roleId == Game.roles.SERGEANT)

    for (const index in koms) {
      const kom = koms[index]

      // Записываю в базу роль игрока, которую они видят
      await GameRole.create({
        gameId: game.id,
        accountId: kom.accountId,
        playerId: player.accountId,
        roleId: player.roleId
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

  getKomId() {
    const { players } = this
    for(const index in players) {
      const player = players[index]
      if (player.roleId == Game.roles.KOMISSAR)
        return player.accountId
    }
    return null
  }

  // Проверка на окончание игры
  async isOver() {
    console.log('Проверка на конец игры...');
    const { players } = this

    let aliveMafia = 0
    let aliveCitizens = 0
    let aliveManiac = 0

    // Считаю какие роли ещё в игре
    for (let index = 0; index < players.length; index++) {
      const player = players[index]
      console.log(`Смотрю игрока ${player.username} со статусом ${player.status}`);
      // Если игрок ещё в игре
      if (
        player.status == GamePlayer.playerStatuses.IN_GAME ||
        player.status == GamePlayer.playerStatuses.FREEZED
      ) {
        console.log(`Игрок ${player.username} ещё в игре с ролью ${player.roleId}`);
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

    console.log(`Итого: граждан: ${aliveCitizens}, мафии: ${aliveMafia}, маняьк: ${aliveManiac}`)

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

    console.log('Игра продолжается...')

    // Игра продолжается
    return null
  }

  // Игра окончена
  async gameOver(side) {
    const { game, room, players } = this

    // Завершаю обработку периодов
    await this.setPeriod(Game.periods.END, 0)

    // Победившие игроки
    const winners = players.filter(p => p.status == GamePlayer.playerStatuses.IN_GAME || p.status == GamePlayer.playerStatuses.FREEZED)

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

    if (side == Game.sides.DRAW) {
      this.systemMessage('Игра окончена. Ничья.')
    }

    if (side == Game.sides.CITIZENS) {
      this.systemMessage('Игра окончена. Честные жители победили.')
    }

    if (side == Game.sides.MAFIA) {
      this.systemMessage('Игра окончена. Мафия победила.')
    }

    if (side == Game.sides.MANIAC) {
      this.systemMessage('Игра окончена. Маньяк победил.')
    }

    room.emit('game.over', side)

    // Запуск процесса раздачи подарков победившей стороне ...
  }

  getId() {
    return this.game.id
  }

  getPlayerById(id) {
    const player = this.players.filter((p) => {
      return p.accountId == id
    })
    if (player.length == 1) return player[0]
    return null
  }

  getPlayerByName(name) {
    const player = this.players.filter((p) => {
      return p.username == name
    })
    if (player.length == 1) return player[0]
    return null
  }

  whait(seconds) {
    return new Promise((resolve, _) => {
      setTimeout(() => resolve(), seconds * 1000)
    })
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

  /* ========================================
     ==== Функции реализуемые в потомках ====
     ======================================== */

  // Доступные роли в зависимости от режима и количества игроков
  async getAvailableRoles() {
    throw new Error('Реализовать в потомках')
  }

  // Вычисление следующего периода игры
  async nextPeriod() {
    throw new Error('Реализовать в потомках')
  }

  // Первый день
  async afterStart() {
    throw new Error('Реализовать в потомках')
  }

  // После дня
  async afterDay() {
    throw new Error('Реализовать в потомках')
  }

  // После хода кома
  async afterKom() {
    throw new Error('Реализовать в потомках')
  }

  // После ночи
  async afterNight() {
    throw new Error('Реализовать в потомках')
  }

  // После проверки
  async afterTransition() {
    throw new Error('Реализовать в потомках')
  }
}

module.exports = GameBase
