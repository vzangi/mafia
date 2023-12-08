const Game = require('../models/Game')
const GamePlayer = require('../models/GamePlayer')
const GameClassic = require('./GameClassic')
const deadlineInterval = 1000
const minCount = 3

// Класс для управления текущими играми
class Games {
  // Буфер для хранения текущих игр
  static activeGames = {}

  // Буфер для заявок на игры
  static whatingGames = {}

  // Загрузка игр и заявок
  static async loadGames(io) {
    const activeGames = await Game.findAll({
      where: {
        status: Game.statuses.STARTED,
      },
    })

    // Загрузка текущих игр
    activeGames.forEach((game) => Games.loadActiveGame(io, game))
    console.log('active games: ', activeGames)

    const whatingGames = await Game.scope('def').findAll({
      where: {
        status: Game.statuses.WHAITNG,
      },
    })

    // Загрузка заявок
    whatingGames.forEach((game) => (Games.whatingGames[game.id] = game))
    console.log('whating games: ', whatingGames)

    // Раз в секунду проверяю заявки с истёкшим сроком дедлайна
    setInterval(Games.checkDeadLine.bind(null, io), deadlineInterval)
  }

  // Проверка на истекший дедлайн заявки
  static async checkDeadLine(io) {
    const date = new Date()
    for (let gameId in Games.whatingGames) {
      const game = Games.whatingGames[gameId]

      if (game.deadline < date) {
        // Убираю заявку из списка ожидания
        delete Games.whatingGames[gameId]

        // Проверяю количество игроков в заявке
        const check = await Games.checkNeededPlayersCount(game)

        if (check) {
          try {
            await Games.start(io, game)
            break
          } catch (error) {
            console.log(error.message)
          }
        }
        // Если их меньше чем необходимо - удаляю заявку
        await Games.remove(io, game)
      }
    }
  }

  static async start(io, game) {
    if (Games.whatingGames[game.id]) {
      delete Games.whatingGames[game.id]
    }

    // Загружаю игру
    await Games.loadActiveGame(io, game)

    // Уведомляю о начале игры
    io.of('/lobbi').emit('game.play', game.id)
  }

  static async remove(io, game) {
    if (Games.whatingGames[game.id]) {
      delete Games.whatingGames[game.id]
    }

    // Освобождаю игроков из заявки
    await GamePlayer.update(
      {
        status: GamePlayer.playerStatuses.LEAVE,
      },
      {
        where: {
          gameId: game.id,
          status: GamePlayer.playerStatuses.WHAITNG,
        },
      }
    )

    // Ставлю статус - игра не началась
    game.status = Game.statuses.NOT_STARTED
    await game.save()

    io.of('/lobbi').emit('game.remove', game.id)
  }

  static async checkNeededPlayersCount(game) {
    const playersInGame = await GamePlayer.count({
      where: {
        gameId: game.id,
        status: GamePlayer.playerStatuses.WHAITNG,
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

  // Загрузка игры в буфер
  static async loadActiveGame(io, game) {
    let newGame = null

    if (game.gametypeId == 1) {
      newGame = new GameClassic(io, game)
    }

    if (!newGame) {
      throw new Error('Игра этого типа пока не поддерживается')
    }

    Games.activeGames[newGame.getId()] = newGame
    await newGame.startGame()
  }

  static async loadWhaitingGame(game) {}

  // Получение игры из буфера
  static getGame(id) {
    try {
      const game = Games.activeGames[id]
      return game
    } catch (error) {
      console.log('Игра с таким id не найдена', id)
      return null
    }
  }

  // Удаление игры из буфера
  static removeGame(id) {
    try {
      const game = Games.activeGames[id]
      delete Games.activeGames[id]
    } catch (error) {
      console.log('Игра с таким id не найдена', id)
    }
  }
}

module.exports = Games
