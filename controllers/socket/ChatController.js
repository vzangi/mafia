const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/ChatService')
const log = require('../../units/customLog')

class ChatController extends BaseSocketController {
	// Список последних сообщений
	async lastMessages(callback) {
		try {
			const messages = await this.service.lastMessages()
			if (callback) callback(messages)
		} catch (error) {
			log(error)
			if (callback) callback([])
		}
	}

	// Пришло сообщение
	async message(message) {
		try {
			await this.service.message(message)
		} catch (error) {
			log(error)
		}
	}

	// Удаление сообщения из чата
	async removeMessage(id) {
		try {
			await this.service.removeMessage(id)
		} catch (error) {
			log(error)
		}
	}

	// Пользователь начал что-то печатать в чате
	typingBegin() {
		try {
			this.service.typingBegin()
		} catch (error) {
			log(error)
		}
	}

	// Пользователь перестал печатать
	typingEnd() {
		try {
			this.service.typingEnd()
		} catch (error) {
			log(error)
		}
	}
}

module.exports = (io, socket) => {
	return new ChatController(io, socket, Service)
}
