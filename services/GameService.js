const Game = require('../models/Game')
const GamePlayer = require('../models/GamePlayer')

class GameService {
  // Страница игры
  async game(gameId) {
    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    const game = await Game.findByPk(gameId)

    if (!game) {
      throw new Error('Игра не найдена')
    }

    if (game.status < 2) {
      throw new Error('В эту игру нельзя войти')
    }

    const seconds = Math.floor(new Date(game.deadline) * 1 / 1000 - Date.now() * 1 / 1000)

    const players = await GamePlayer.scope({ method: ['ingame', gameId] }).findAll()

    const data = {
      game,
      players,
      seconds: seconds < 0 ? 0 : seconds,
    }

    return data
  }
}

module.exports = new GameService()
