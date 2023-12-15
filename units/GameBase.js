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

      console.log('Рассылаю уведомления о начале игры')

      // Уведомляю игроков о начале игры
      this.notify()

      await this.systemMessage(
        `Игра началась ${getCoolDateTime(game.startedAt)}.`
      )

      const inGameStr = this.players.map((p) => p.username).join(', ')

      await this.systemMessage(`В игре участвуют ${inGameStr}.`)

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
    players.forEach(async (player) => {
      console.log(`Уведомляю ${player.username}`)
      const ids = this.getUserSocketIds(player.accountId)
      ids.forEach((sid) => {
        console.log(`Отправляю уведомление ${player.username} на sid #${sid}`)
        io.to(sid).emit('game.play', game.id)
      })
    })
  }

  getUserSocketIds(userId) {
    const { io } = this
    const ids = []
    try {
      // Проходимся по всем сокетам
      for (const [sid, s] of io.of('/lobbi').sockets) {
        // Если в сокете нет пользователя (он гость), то пропускаем его
        if (!s.user) continue
        // Если в каком-то из сокетов найден нужный игрок
        if (s.user.id == userId) {
          ids.push(sid)
        }
      }
    } catch (error) {
      console.log(error)
    }
    return ids
  }

  // Подготовка к старту
  async prepare() {
    const { game } = this
    try {
      // Для игроков, которые были в зявке ставлю статус - в игре
      await GamePlayer.update(
        {
          status: GamePlayer.playerStatuses.IN_GAME,
        },
        {
          where: {
            gameId: game.id,
            status: GamePlayer.playerStatuses.WHAITNG,
          },
        }
      )

      // Распределение ролей ...
      await this.takeRoles()

      // Знакомлю мафию и комов
      await this.meeting()

      return true
    } catch (error) {
      console.log(error)
      return false
    }
  }

  // Распределение ролей ...
  async takeRoles() {
    const { game } = this
    const availableRoles = await this.getAvailableRoles()

    // Раздаю роли
    for (let k = 0; k < availableRoles.length; k++) {
      // Беру роль и количество игроков с ней
      const [roleId, cnt] = availableRoles[k]

      // Беру из заявки cnt случайных игроков без роли и ставлю им роль
      for (let index = 0; index < cnt; index++) {
        // Беру игрока из заявки которому ещё не назначена роль
        const player = await GamePlayer.findOne({
          where: {
            gameId: game.id,
            status: GamePlayer.playerStatuses.IN_GAME,
            roleId: null,
          },
          order: sequelize.random(),
        })

        if (!player) {
          throw new Error('Не удалось раздать роли')
        }

        // Выдаю ему роль
        player.roleId = roleId
        await player.save()
      }
    }

    // Оставшиеся без ролей игроки - чижи
    await GamePlayer.update(
      {
        roleId: Game.roles.CITIZEN,
      },
      {
        where: {
          gameId: game.id,
          status: GamePlayer.playerStatuses.IN_GAME,
          roleId: null,
        },
      }
    )
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
    const msg = await GameChat.newMessage(game.id, null, message)

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
    const { game, room } = this

    // Завершаю обработку периодов
    await this.setPeriod(Game.periods.END, 0)

    // Освобождаю победивших игроков из заявки
    await GamePlayer.update(
      {
        status: GamePlayer.playerStatuses.WON,
      },
      {
        where: {
          gameId: game.id,
          status: GamePlayer.playerStatuses.IN_GAME,
        },
      }
    )

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
    const player = this.players.filter((p) => p.accountId == id)
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
