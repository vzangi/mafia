const Game = require('../models/Game')

class GameService {
  // Страница игры
  async game(gameId, user) {
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    const game = await Game.findByPk(gameId)

    if (!game) {
      throw new Error('Игра не найдена')
    }

    if (game.status != 2) {
      throw new Error('В эту игру нельзя войти')
    }

    const data = { game }

    return data
  }

  async log(gameId) {
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    const game = Game.findByPk(gameId)

    if (!game) {
      throw new Error('Игра не найдена')
    }

    if (game.status < 2) {
      throw new Error('У этой игры нет лога')
    }

    return game
  }
}

module.exports = new GameService()
