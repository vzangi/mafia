const { Op } = require('sequelize')
const Account = require('../../models/Account')
const Game = require('../../models/Game')
const GamePlayer = require('../../models/GamePlayer')
const GameType = require('../../models/GameType')
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

  _checkDeadLine() {
    const date = new Date()
    for (let index = 0; index < LobbiService.waitingGames.length; index++) {
      const game = LobbiService.waitingGames[index]

      if (game.deadline < date) {
        // console.log(`Для игры ${game.id} дедлайн истёк`)

        // Проверяю количество игроков в заявке
        // Если их меньше чем необходимо, то удаляю заявку

        // Иначе запускаю игру

        // Пока просто удаляю...
        LobbiService.waitingGames.splice(index, 1)
        index--

        this._removeGame(game)
      }
    }
  }

  // Удаление игры
  async _removeGame(game) {
    const { io } = this

    // Ставлю статус 1 - игра не началась
    game.status = 1
    await game.save()

    // Для игроков тоже ставлю статус 1
    await GamePlayer.update(
      {
        status: 1,
      },
      {
        where: {
          gameId: game.id,
          status: 0,
        },
      }
    )

    // console.log(`game.remove ${game.id}`);

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

    // Проверяю, может ли игрок создать заявку:

    // 1. Он не находится в другой заявке
    const inGame = await GamePlayer.count({
      where: {
        accountId: user.id,
        status: 0,
      },
    })

    if (inGame != 0) {
      throw new Error('Ты находишься в другой заявке')
    }

    // 2. Нет запрета на создание заявки

    // ... надо будет придумать

    // Устанавливаю дедлайн - время когда заявка удалиться,
    // если нуное количество игроков не соберётся
    const dt = new Date()
    const deadline = new Date(dt.getTime() + waitingTime * 60000)

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

    if (game.status != 0) {
      throw new Error('К этой заявке уже нельзя присоединиться')
    }

    if (game.playersCount == game.gameplayers.length) {
      throw new Error('В заявке нет свободных мест')
    }

    // Проверяю находится ли игрок в другой заявке
    const inGame = await GamePlayer.count({
      where: {
        accountId: user.id,
        [Op.or]: [{ status: 0 }, { status: 3 }],
      },
    })

    if (inGame) {
      throw new Error('Ты всё ещё в другой заявке')
    }

    // Проверяю, был ли игрок удалён из этой заявки
    const wasRemoved = await GamePlayer.count({
      where: {
        accountId: user.id,
        status: 2,
        gameId,
      },
    })

    if (wasRemoved) {
      throw new Error('Ты был удалён из этой заявки')
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

    if (game.status != 0) {
      throw new Error('Эту заявку нельзя удалить')
    }

    // Ищу игрока в этой заявке
    const playerInGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: user.id,
        status: 0,
      },
      include: [
        {
          model: Account,
          attributes: ['username'],
        },
      ],
    })

    if (!playerInGame) {
      throw new Error('Тебя нет в этой заявке')
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

    if (game.status != 0) {
      throw new Error('Эту заявку нельзя покинуть')
    }

    // Ищу игрока в этой заявке
    const playerInGame = await GamePlayer.findOne({
      where: {
        gameId,
        accountId: user.id,
        status: 0,
      },
      include: [
        {
          model: Account,
          attributes: ['username'],
        },
      ],
    })

    if (!playerInGame) {
      throw new Error('Тебя нет в этой заявке')
    }

    if (game.gameplayers.length == 1) {
      await this._removeGame(game)
      return
    }

    // Ставлю статус игрока - 1 (не в заявке)
    playerInGame.status = 1
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

    if (game.status != 0) {
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
        status: 0,
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
        status: 0,
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

    // Ставлю статус игрока - 2 (удалён из заявки)
    playerInGame.status = 2
    await playerInGame.save()

    // Отправляю всем информацию что игрок покинул заявку
    const { io } = this
    io.of('/lobbi').emit('game.player.leave', gameId, username)
  }
}

module.exports = LobbiService
