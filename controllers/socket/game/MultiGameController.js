const BaseGameController = require('./BaseGameController')
const Service = require('../../../services/socket/game/MultiGameService')

class MultiGameController extends BaseGameController {
	// Защита игрока от выстрела мафии
	async protection(username) {
		try {
			await this.service.protection(username)
		} catch (error) {
			console.log(error)
		}
	}
}

module.exports = (io, socket) => {
	return new MultiGameController(io, socket, Service)
}
