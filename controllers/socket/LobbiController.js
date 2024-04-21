const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/LobbiService')
const log = require('../../units/customLog')

class LobbiController extends BaseSocketController {
	// Создаю заявку на игру
	async makeGame(settings, callback) {
		try {
			const game = await this.service.makeGame(settings)
			if (callback) callback({ status: 0, game })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Добавляю игрока в очередь соревновательного режима
	async contests(data, callback) {
		try {
			await this.service.addToContest(data)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Покинуть очередь соревновательного реима
	async leaveContest(callback) {
		try {
			await this.service.leaveContest()
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Получение текущих заявок
	async getGames(callback) {
		try {
			const data = await this.service.getGames()
			if (callback) callback({ status: 0, data })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Присоединиться к заявке
	async toGame(gameId, callback) {
		try {
			await this.service.toGame(gameId)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Удаление заявки
	async removeGame(gameId, callback) {
		try {
			await this.service.removeGame(gameId)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Покинуть заявку
	async leaveGame(gameId, callback) {
		try {
			await this.service.leaveGame(gameId)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Удалить из заявки игрока
	async removePlayerFromGame(gameId, username, callback) {
		try {
			await this.service.removePlayerFromGame(gameId, username)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Жалоба
	async claim(data, callback) {
		try {
			await this.service.claim(data)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Запуск игры
	async startGame(gameId, callback) {
		try {
			await this.service.startGame(gameId)
			if (callback) callback({ status: 0 })
		} catch (error) {
			log(error)
			if (callback) callback({ status: 1, msg: error.message })
		}
	}
}

module.exports = (io, socket) => {
	return new LobbiController(io, socket, Service)
}
