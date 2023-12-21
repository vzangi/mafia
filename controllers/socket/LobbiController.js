const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/LobbiService')

class LobbiController extends BaseSocketController {
  // Возвращаю вещь в инвентарь
  async makeGame(settings, callback) {
    try {
      const game = await this.service.makeGame(settings)
      callback({ status: 0, game })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Получение текущих заявок
  async getGames(callback) {
    try {
      const games = await this.service.getGames()
      callback({ status: 0, games })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Присоединиться к заявке
  async toGame(gameId, callback) {
    try {
      await this.service.toGame(gameId)
      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Удаление заявки
  async removeGame(gameId, callback) {
    try {
      await this.service.removeGame(gameId)
      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Покинуть заявку
  async leaveGame(gameId, callback) {
    try {
      await this.service.leaveGame(gameId)
      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Удалить из заявки игрока
  async removePlayerFromGame(gameId, username, callback) {
    try {
      await this.service.removePlayerFromGame(gameId, username)
      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new LobbiController(io, socket, Service)
}
