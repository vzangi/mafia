const Games = require('../../../units/GamesManager')
const BaseGameService = require('./BaseGameService')

class ConstructorGameService extends BaseGameService {
  // Защита игрока от выстрела мафии
  async therapy(username) {
    const { user, gameId } = this.socket

    if (!user) return

    // Беру текущую игру
    const game = Games.getGame(gameId)

    // Игра должна быть загружена
    if (!game) throw new Error('Игра не найдена')

    // Защищаю игрока
    await game.therapy(username, user.id)
  }
}

module.exports = ConstructorGameService
