const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/ChatService')

class ChatController extends BaseSocketController {
  
  // Список последних сообщений
  async lastMessages(callback) {
    try {
      const messages = await this.service.lastMessages()
      callback(messages)
    } catch (error) {
      console.log(error);
      callback([])
    }
  }

  // Пришло сообщение
  async message(message) {
    try {
      await this.service.message(message)
    } catch (error) {
      console.log(error);
    }
  }

  // Пользователь начал что-то печатать в чате
  typingBegin() {
    try {
      this.service.typingBegin()
    } catch (error) {
      console.log(error);
    }
  }

  // Пользователь перестал печатать
  typingEnd() {
    try {
      this.service.typingEnd()
    } catch (error) {
      console.log(error);
    }
  }
}

module.exports = (io, socket) => {
  return new ChatController(io, socket, Service)
}
