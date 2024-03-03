const BaseGameController = require('./BaseGameController')
const Service = require('../../../services/socket/game/ConstructorGameService')
const log = require('../../../units/customLog')

class ConstructorGameController extends BaseGameController {
	// Защита игрока от выстрела мафии
	async therapy(username) {
		try {
			await this.service.therapy(username)
		} catch (error) {
			log(error)
		}
	}
}

module.exports = (io, socket) => {
	return new ConstructorGameController(io, socket, Service)
}
