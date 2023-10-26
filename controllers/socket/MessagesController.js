const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/MessagesService')

class MessagesController extends BaseSocketController {
  
  // Пользователь перестал печатать
  typingEnd(friendId) {
    try {
      this.service.typingEnd(friendId)
    } catch (error) {
      console.log(error);
    }
  }

  // Пользователь начал что-то печатать в чате
  typingBegin(friendId) {
    try {
      this.service.typingBegin(friendId)
    } catch (error) {
      console.log(error)
    }
  }

  // Проверка на дружеские отношения
  async isFriend(friendId, callback) {
    try {
      const friend = await this.service.isFriend(friendId)
      callback({ status: 0, friend })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Получение последних сообщений
  async getMessages(friendId, offset, callback) {
    try {
      const messages = await this.service.getMessages(friendId, offset)
      callback({ status: 0, messages })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Получение списка друзей с которыми есть приватный чат
  async getList(callback) {
    try {
      const lastMsgs = await this.service.getList()
      callback({ status: 0, lastMsgs, userId: this.user.id })
    } catch (error) {
      console.log(error);
      callback({ status: 1, msg: error.message })
    }
  }

  // Отправка сообщения
  async sendMessage(friendId, message, callback) {
    try {
      const msg = await this.service.sendMessage(friendId, message)
      callback(0, msg)
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Пометить сообщения прочтёнными
  async readMessages(friendId, callback) {
    try {
      await this.service.readMessages(friendId)
      if (callback)
        callback({ status: 0 })
    } catch (error) {
      if (callback)
        callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new MessagesController(io, socket, Service)
}
