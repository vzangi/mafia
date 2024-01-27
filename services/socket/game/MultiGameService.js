const Games = require('../../../units/GamesManager')
const BaseGameService = require('./BaseGameService')

class MultiGameService extends BaseGameService {
	// Защита игрока от выстрела мафии
	async protection(username) {
		const { user, gameId } = this.socket

		if (!user) return

		// Беру текущую игру
		const game = Games.getGame(gameId)

		// Игра должна быть загружена
		if (!game) throw new Error('Игра не найдена')

		// Защищаю игрока
		await game.protection(username, user.id)
	}
}

module.exports = MultiGameService
