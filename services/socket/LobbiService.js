const htmlspecialchars = require('htmlspecialchars')
const Account = require('../../models/Account')
const Friend = require('../../models/Friend')
const Game = require('../../models/Game')
const GamePlayer = require('../../models/GamePlayer')
const { playerStatuses } = GamePlayer
const { statuses } = Game
const minCount = 3
const { getCoolDateTime } = require('../../units/helpers')
const Games = require('../../units/Games')

const BaseService = require('./BaseService')

class LobbiService extends BaseService {
  // Рассылаю уведомления ...
  async _notify(game) {
    // Уведомляю о начале игры
    const { io, socket } = this
    io.of('/lobbi').emit('game.start', game.id)

    // Беру всех участников
    const players = await GamePlayer.findAll({
      where: {
        gameId: game.id,
        status: playerStatuses.IN_GAME,
      },
      attributes: ['accountId'],
    })

    // Отправляю каждому игроку сообщение с номером заявки
    players.forEach(async (player) => {
      const ids = this.getUserSocketIds(player.accountId)
      ids.forEach((sid) => {
        socket.broadcast.to(sid).emit('game.start', game.id)
      })
    })
  }

  // Новая заявка на игру
  async makeGame(gametypeId, playersCount, waitingTime, description = '') {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const account = await Account.findByPk(user.id, {
      attributes: ['username'],
    })

    if (!account) {
      throw new Error('Игрок не найден')
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
      username: account.username,
      gameId: newGame.id,
    })

    // Получаю новую заявку
    const game = await Game.scope('def').findByPk(newGame.id)

    // Добавляю её в список ожидающих заявок
    Games.whatingGames[game.id] = game

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

    const account = await Account.findByPk(user.id, {
      attributes: ['username', 'avatar', 'online'],
    })

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

    if (game.status != statuses.WHAITNG) {
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
      throw new Error('Вы были удалёны из этой заявки')
    }

    // Если создатель заявки имеет vip-статус
    if (game.account.vip) {
      // Проверяю, не находится ли текущий игрок у него в чс

      console.log(game.account.username, user.id)

      const acc = await Account.findOne({
        where: { username: game.account.username },
      })

      const isBlocked = await Friend.findOne({
        where: {
          status: -2,
          accountId: acc.id,
          friendId: user.id,
        },
      })

      if (isBlocked) {
        throw new Error('Вы в ЧС у создателя заявки')
      }
    }

    // Добавляю игрока в заявку
    GamePlayer.create({
      gameId,
      accountId: user.id,
      username: account.username,
    })

    // Отправляю всем информацию об игроке и зявке
    const { io } = this
    io.of('/lobbi').emit('game.player.add', gameId, account)

    // Если набралось требуемое количество игроков
    if (game.playersCount == game.gameplayers.length + 1) {
      await Games.start(io, game)
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

    if (game.status != statuses.WHAITNG) {
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
    await Games.remove(this.io, game)
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

    if (game.status != statuses.WHAITNG) {
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
      await Games.remove(this.io, game)
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

    if (game.status != statuses.WHAITNG) {
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
      await Games.remove(this.io, game)
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
