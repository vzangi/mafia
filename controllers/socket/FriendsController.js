const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/FriendsService')

class FriendsController extends BaseSocketController {
	// Добавление в друзья
	async add(friendId, callback) {
		try {
			await this.service.add(friendId)
			if (callback) callback({ status: 0 })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Подтверждение добавления в друзья
	async accept(friendId, callback) {
		try {
			await this.service.accept(friendId)
			if (callback) callback({ status: 0, msg: 'Теперь вы друзья' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Отклонение добавления в друзья
	async decline(friendId, callback) {
		try {
			await this.service.decline(friendId)
			if (callback) callback({ status: 0, msg: 'Запрос отклонён' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Удаление из друзей
	async remove(friendId, callback) {
		try {
			await this.service.remove(friendId)
			if (callback) callback({ status: 0, msg: 'Запрос выполнен' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Блокировка (ЧС)
	async block(friendId, callback) {
		try {
			await this.service.block(friendId)
			if (callback) callback({ status: 0, msg: 'Запрос выполнен' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Разблокировка от ЧС
	async unblock(friendId, callback) {
		try {
			await this.service.unblock(friendId)
			if (callback) callback({ status: 0, msg: 'Запрос выполнен' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Блокировка в ответ (ЧС)
	async blockToo(friendId, callback) {
		try {
			await this.service.blockToo(friendId)
			if (callback) callback({ status: 0, msg: 'Запрос выполнен' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Позвать в ЗАГС
	async zags(friendId, callback) {
		try {
			await this.service.zags(friendId)
			if (callback) callback({ status: 0, msg: 'Предложение сделано' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Согласие на ЗАГС
	async zagsAccept(friendId, callback) {
		try {
			await this.service.zagsAccept(friendId)
			if (callback) callback({ status: 0, msg: 'Запрос выполнен' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Отказ от ЗАГСА
	async zagsDecline(friendId, callback) {
		try {
			await this.service.zagsDecline(friendId)
			if (callback) callback({ status: 0, msg: 'Запрос выполнен' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Отозвать предложение
	async recall(friendId, callback) {
		try {
			await this.service.recall(friendId)
			if (callback) callback({ status: 0, msg: 'Предложение отозвано' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Развод
	async divorce(friendId, callback) {
		try {
			await this.service.divorce(friendId)
			if (callback) callback({ status: 0, msg: 'Вы развелись' })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}
}

module.exports = (io, socket) => {
	return new FriendsController(io, socket, Service)
}
