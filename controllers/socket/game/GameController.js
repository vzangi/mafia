const BaseSocketController = require('../BaseSocketController')
const Service = require('../../../services/socket/game/GameService')

class GameController extends BaseSocketController {
  // Получение роли
  async getRole(callback) {
    try {
      const role = await this.service.getRole()
      callback(role)
    } catch (error) {
      console.log(error)
      callback('Ошибка')
    }
  }

  // Список последних сообщений
  async getMessages(callback) {
    try {
      const messages = await this.service.getMessages()
      callback(messages)
    } catch (error) {
      console.log(error)
      callback('Ошибка')
    }
  }

  // Пришло сообщение
  async message(message, isPrivate = false) {
    try {
      await this.service.message(message, isPrivate)
    } catch (error) {
      console.log(error)
    }
  }

  // Голос
  async vote(username) {
    try {
      await this.service.vote(username)
    } catch (error) {
      console.log(error)
    }
  }
}

module.exports = (io, socket) => {
  return new GameController(io, socket, Service)
}
