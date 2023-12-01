const htmlspecialchars = require('htmlspecialchars')
const { Op } = require('sequelize')
const Account = require('../../models/Account')
const Game = require('../../models/Game')
const GamePlayer = require('../../models/GamePlayer')
const GameType = require('../../models/GameType')
const { playerStatuses } = GamePlayer
const { gameStatuses } = Game
const BaseService = require('./BaseService')

class LobbiService extends BaseService {
  static waitingGames = []
  static intervalStarted = false

  constructor(io, socket) {
    super(io, socket)

    // Проверяю был ли запущен процесс проверки заявок
    if (!LobbiService.intervalStarted) {
      // Ставлю маркер запуска
      LobbiService.intervalStarted = true

      // Проверяю наличие запущенных игр
      Game.scope('def')
        .findAll({
          where: {
            status: 0,
          },
        })
        .then((games) => {
          games.forEach((game) => LobbiService.waitingGames.push(game))
        })

      // Раз в секунду проверяю заявки с истёкшим сроком дедлайна
      setInterval(this._checkDeadLine.bind(this), 1000)
    }
  }

  async checkNeededPlayersCount(game) {
    const minCount = 6

    const playersInGame = await GamePlayer.count({
      where: {
        gameId: game.id,
        status: playerStatuses.WHAITNG,
      },
    })

    if (playersInGame >= minCount) return true

    // Если мультирежим
    if (game.gametypeId == 4) {
      // Игроков должно быть больше, чем задано
      if (playersInGame >= game.playersCount) return true
    }

    return false
  }

  // Проверка на истекший дедлайн заявки
  async _checkDeadLine() {
    const date = new Date()
    for (let index = 0; index < LobbiService.waitingGames.length; index++) {
      const game = LobbiService.waitingGames[index]

      if (game.deadline < date) {
        // console.log(`Для игры ${game.id} дедлайн истёк`)

        // Убираю заявку из списка ожидания
        LobbiService.waitingGames.splice(index, 1)
        index--

        // Проверяю количество игроков в заявке
        const check = await this.checkNeededPlayersCount(game)

        if (check) {
          // Если игроков хватает, чтобы начать - запускаю игру
          this._startGame(game)
        } else {
          // Если их меньше чем необходимо - удаляю заявку
          this._removeGame(game)
        }
      }
    }
  }

  async _startGame(game) {
    // Ставлю статус - игра началась
    game.status = gameStatuses.NOT_STARTED
    // game.status = gameStatuses.STARTED
    await game.save()

    // Для игроков, которые были в зявке ставлю статус - в игре
    await GamePlayer.update(
      {
        status: playerStatuses.IN_GAME,
      },
      {
        where: {
          gameId: game.id,
          status: playerStatuses.WHAITNG,
        },
      }
    )

    console.log(`game.start ${game.id}`)

    // Уведомляю о начале игры
    const { io } = this
    io.of('/lobbi').emit('game.start', game.id)

    // Рассылаю уведомления ...

    // Распределение ролей ...
  }

  // Удаление игры
  async _removeGame(game) {
    const { io } = this

    // Ставлю статус - игра не началась
    game.status = gameStatuses.NOT_STARTED
    await game.save()

    // Освобождаю игроков из заявки
    await GamePlayer.update(
      {
        status: playerStatuses.LEAVE,
      },
      {
        where: {
          gameId: game.id,
          status: playerStatuses.WHAITNG,
        },
      }
    )

    // Уведомляю об удалении заявки
    io.of('/lobbi').emit('game.remove', game.id)
  }

  // Доступные типы игр
  async getGameTypes() {
    const types = await GameType.findAll()
    return types
  }

  // Новая заявка на игру
  async makeGame(gametypeId, playersCount, waitingTime, description = '') {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!gametypeId || !playersCount || !waitingTime) {
      throw new Error('Нет необходимых данных')
    }

    if (gametypeId < 1 || gametypeId > 4) {
      throw new Error('Нет у нас таких режимов')
    }

    if (gametypeId == 1 || gametypeId == 2) {
      if (playersCount < 6) {
        throw new Error('Минимальное количество игроков - 6')
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

    // Проверяю, может ли игрок создать заявку:

    // 1. не находится в другой заявке
    const inGameWaithing = await GamePlayer.findOne({
      where: {
        accountId: user.id,
        status: playerStatuses.WHAITNG,
      },
    })

    if (inGameWaithing) {
      throw new Error('Вы находитесь в другой заявке')
    }

    // 2. не находится в игре
    const inGame = await GamePlayer.findOne({
      where: {
        accountId: user.id,
        status: [playerStatuses.IN_GAME, playerStatuses.FREEZED],
      },
    })

    if (inGame) {
      throw new Error('Вы находитесь в игре')
    }

    // 3. Нет запрета на создание заявки ...

    // Устанавливаю дедлайн - время когда заявка удалиться,
    // если нуное количество игроков не соберётся
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
    })

    // Добавляю в неё игрока
    const player = await GamePlayer.create({
      accountId: user.id,
      gameId: newGame.id,
    })

    // Получаю новую заявку
    const game = await Game.scope('def').findByPk(newGame.id)

    // Добавляю её в список ожидающих заявок
    LobbiService.waitingGames.push(game)

    // Уведомляю подключённые сокеты о новой заявке
    const { socket } = this
    socket.broadcast.emit('game.new', game)

    // и возвращаю её
    return game
  }

  // Получение текущих заявок
  async getGames() {
    const games = await Game.scope('def').findAll()
    return games
  }

  // Присоединиться к заявке
  async toGame(gameId) {
    const { user } = this
    if (!user) {
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

    if (game.status != gameStatuses.WHAITNG) {
      throw new Error('К этой заявке уже нельзя присоединиться')
    }

    if (game.playersCount == game.gameplayers.length) {
      throw new Error('В заявке нет свободных мест')
    }

    // Проверяю находится ли игрок в другой заявке
    const inGame = await GamePlayer.count({
      where: {
        accountId: user.id,
        status: [
          playerStatuses.WHAITNG,
          playerStatuses.IN_GAME,
          playerStatuses.FREEZED,
        ],
      },
    })

    if (inGame) {
      throw new Error('Вы всё ещё в другой заявке')
    }

    // Проверяю, был ли игрок удалён из этой заявки
    const wasRemoved = await GamePlayer.count({
      where: {
        accountId: user.id,
        status: playerStatuses.DROPPED,
        gameId,
      },
    })

    if (wasRemoved) {
      throw new Error('Вы были удалён из этой заявки')
    }

    // Если создатель заявки имеет vip-статус
    if (game.account.vip) {
      // Проверяю, не находится ли текущий игрок у него в чс

      console.log(game.account.username, user.id)
    }

    // Добавляю игрока в заявку
    GamePlayer.create({
      gameId,
      accountId: user.id,
    })

    // Беру необходимые данные из аккаунта
    const account = await Account.findByPk(user.id, {
      attributes: ['username', 'avatar', 'online'],
    })

    // Отправляю всем информацию об игроке и зявке
    const { io } = this
    io.of('/lobbi').emit('game.player.add', gameId, account)
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

    if (game.status != gameStatuses.WHAITNG) {
      throw new Error('Эту заявку нельзя удалить')
    }

    // Ищу игрока в этой заявке
    const playerInGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: user.id,
        status: playerStatuses.WHAITNG,
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
    await this._removeGame(game)
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

    if (game.status != gameStatuses.WHAITNG) {
      throw new Error('Эту заявку нельзя покинуть')
    }

    // Ищу игрока в этой заявке
    const playerInGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: user.id,
        status: playerStatuses.WHAITNG,
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
    if (game.gameplayers.length == 1) {
      await this._removeGame(game)
      return
    }

    // Ставлю статус игрока - 1 (не в заявке)
    playerInGame.status = playerStatuses.LEAVE
    await playerInGame.save()

    // Отправляю всем информацию что игрок покинул заявку
    const { io } = this
    io.of('/lobbi').emit(
      'game.player.leave',
      gameId,
      playerInGame.account.username
    )
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

    if (game.status != gameStatuses.WHAITNG) {
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
        status: playerStatuses.WHAITNG,
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
        status: playerStatuses.WHAITNG,
      },
    })

    if (!playerInGame) {
      throw new Error('Игрока нет в этой заявке')
    }

    // Если в заявке остался только один игрок - удаляю её
    if (game.gameplayers.length == 1) {
      await this._removeGame(game)
      return
    }

    // Ставлю статус игрока - удалён из заявки
    playerInGame.status = playerStatuses.DROPPED
    await playerInGame.save()

    // Отправляю всем информацию что игрок покинул заявку
    const { io } = this
    io.of('/lobbi').emit('game.player.leave', gameId, username)
  }
}

module.exports = LobbiService
