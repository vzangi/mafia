const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/PunishmentService')
const log = require('../../units/customLog')

class PunishmentController extends BaseSocketController {
	// Снятие запрета
	async removePunish(id) {
		try {
			const { account } = this.socket

			if (account.role != 1) {
				throw new Error('Нет доступа')
			}

			await this.service.removePunish(id)
		} catch (error) {
			log(error)
		}
	}

	// Создание запрета
	async makePunish(data, callback) {
		try {
			const { account } = this.socket

			if (account.role != 1) {
				throw new Error('Нет доступа')
			}

			await this.service.makePunish(data)

			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}
}

module.exports = (io, socket) => {
	return new PunishmentController(io, socket, Service)
}
