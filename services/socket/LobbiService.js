const htmlspecialchars = require('htmlspecialchars')
const Account = require('../../models/Account')
const Friend = require('../../models/Friend')
const Game = require('../../models/Game')
const GamePlayer = require('../../models/GamePlayer')
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

    if (gametypeId < 1 || gametypeId > 4) {
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

    // Добавляю её в список ожидающих заявок
    GamesManager.whatingGames[game.id] = game

    // Уведомляю подключённые сокеты о новой заявке
    const { socket } = this
    socket.broadcast.emit('game.new', game)

    // и возвращаю её
    return game
  }

  // Присоединиться к заявке
  async toGame(gameId) {
    const { socket } = this
    const { account } = socket
    if (!account) {
      throw new Error('Не авторизован')
    }

    if (!account) {
      throw new Error('Игрок не найден')
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
