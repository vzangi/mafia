const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/GiftService')

class GiftController extends BaseSocketController {
	// Получение следующей партии открыток пользователя
	async getNext(accountId, lastId, callback) {
		try {
			const gifts = await this.service.getNext(accountId, lastId)
			if (callback) callback({ status: 0, gifts })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Возвращает группы открыток
	async giftGroups(callback) {
		try {
			const groups = await this.service.giftGroups()
			if (callback) callback({ status: 0, groups })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Получение открыток определенной группы
	async giftItems(giftgroupId, lastId, callback) {
		try {
			const gifts = await this.service.giftItems(giftgroupId, lastId)
			if (callback) callback({ status: 0, gifts })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Покупка открытки
	async giftBuy(giftId, to, description, callback) {
		try {
			await this.service.giftBuy(giftId, to, description)
			if (callback) callback({ status: 0 })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Количество новых открыток
	async giftsCount(callback) {
		try {
			const count = await this.service.giftsCount()
			if (callback) callback({ status: 0, count })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Удаление открытки
	async giftRemove(giftId, callback) {
		try {
			await this.service.giftRemove(giftId)
			if (callback) callback({ status: 0 })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}
}

module.exports = (io, socket) => {
	return new GiftController(io, socket, Service)
}
