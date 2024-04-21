const BaseSocketController = require('../BaseSocketController')
const log = require('../../../units/customLog')

class BaseGameController extends BaseSocketController {
	// Получение роли
	async getRole(callback) {
		try {
			const role = await this.service.getRole()
			if (callback) callback(role)
		} catch (error) {
			log(error)
			if (callback) callback('Ошибка')
		}
	}

	// Получение известных ролей
	async getRoles(callback) {
		try {
			const data = await this.service.getRoles()
			if (callback) callback(data)
		} catch (error) {
			log(error)
			if (callback) callback('Ошибка')
		}
	}

	// Список последних сообщений
	async getMessages(callback) {
		try {
			const messages = await this.service.getMessages()
			if (callback) callback(messages)
		} catch (error) {
			log(error)
			if (callback) callback('Ошибка')
		}
	}

	// Лог игры
	async getLog(callback) {
		try {
			const log = await this.service.getLog()
			if (callback) callback(log)
		} catch (error) {
			log(error)
			if (callback) callback('Ошибка')
		}
	}

	// Пришло сообщение
	async message(message, isPrivate = false) {
		try {
			await this.service.message(message, isPrivate)
		} catch (error) {
			log(error)
		}
	}

	// Голос
	async vote(username, callback) {
		try {
			await this.service.vote(username)
			if (callback) callback({ status: 0 })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
			log(error)
		}
	}

	// Выстрел
	async shot(username, callback) {
		try {
			await this.service.shot(username)
			if (callback) callback({ status: 0 })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
			log(error)
		}
	}

	// Проверка
	async prova(username) {
		try {
			await this.service.prova(username)
		} catch (error) {
			log(error)
		}
	}

	// Кто-то печатает
	async typingBegin() {
		try {
			await this.service.typingBegin()
		} catch (error) {
			log(error)
		}
	}

	// Кто-то закончил печатать
	async typingEnd() {
		try {
			await this.service.typingEnd()
		} catch (error) {
			log(error)
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

	// Остановка партии
	async stop() {
		try {
			await this.service.stopTheGame()
		} catch (error) {
			log(error)
		}
	}
}

module.exports = BaseGameController
