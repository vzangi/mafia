const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/UserCountService')
const log = require('../../units/customLog')

class UsersCountController extends BaseSocketController {
	// Количество подключенных пользователей
	count(callback) {
		try {
			const count = this.service.count()
			if (callback) callback({ count })
		} catch (error) {
			log(error)
			if (callback) callback({ count: 0 })
		}
	}

	// Процедура при подключении сокета
	connect() {
		try {
			this.service.connect()
		} catch (error) {
			log(error)
		}
	}

	// При закрытии сокета
	disconnect() {
		try {
			this.service.disconnect()
		} catch (error) {
			log(error)
		}
	}
}

module.exports = (io, socket) => {
	return new UsersCountController(io, socket, Service)
}
