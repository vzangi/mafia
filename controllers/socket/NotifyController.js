const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/NotifyService')
const log = require('../../units/customLog')

class NotifyController extends BaseSocketController {
	// Пометить нотификацию прочитанной
	async read(notifyId) {
		try {
			this.service.read(notifyId)
		} catch (error) {
			log(error)
		}
	}

	// Получение списка непрочитанных нотификаций
	async getNewNotifies(callback) {
		try {
			const notifies = await this.service.getNewNotifies()
			callback({ status: 0, notifies })
		} catch (error) {
			log(error)
			callback({ status: 1, msg: error.message })
		}
	}
}

module.exports = (io, socket) => {
	return new NotifyController(io, socket, Service)
}
