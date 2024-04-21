const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/InventoryService')
const log = require('../../units/customLog')

class InventoryController extends BaseSocketController {
	// Вещи в инвентаре
	async inventoryThings(username, callback) {
		try {
			const things = await this.service.inventoryThings(username)
			if (callback) callback({ status: 0, things })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Крафт
	async kraft(ids, callback) {
		try {
			const thing = await this.service.kraft(ids)
			if (callback) callback({ status: 0, thing })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Активация VIP пропуска
	async vipActivate(id, callback) {
		try {
			await this.service.vipActivate(id)
			if (callback) callback({ status: 0 })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Получение списка вещей набора или кейса
	async getNaborThings(id, callback) {
		try {
			const things = await this.service.getNaborThings(id)
			if (callback) callback({ status: 0, things })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Открыть набор
	async openNabor(naborId, callback) {
		try {
			const thing = await this.service.openNabor(naborId)
			if (callback) callback({ status: 0, thing })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Открыть кейс
	async openKeis(keisId, callback) {
		try {
			const data = await this.service.openKeis(keisId)
			if (callback) callback({ status: 0, data })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Нацепить значок
	async takeBadge(thingId, callback) {
		try {
			await this.service.takeBadge(thingId)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Снять значок
	async untakeBadge(thingId, callback) {
		try {
			await this.service.untakeBadge(thingId)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Взять вещь в игру
	async takeThing(thingId, callback) {
		try {
			await this.service.takeThing(thingId)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Возвращаю вещь в инвентарь
	async untakeThing(thingId, callback) {
		try {
			await this.service.untakeThing(thingId)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}
}

module.exports = (io, socket) => {
	return new InventoryController(io, socket, Service)
}
