const BaseSocketController = require('../BaseSocketController')
const Service = require('../../../services/socket/game/GameService')

class GameController extends BaseSocketController {

  // Список последних сообщений
  async getRole(callback) {
    try {
      const role = await this.service.getRole()
      callback(role)
    } catch (error) {
      console.log(error);
      callback('Ошибка')
    }
  }
}

module.exports = (io, socket) => {
  return new GameController(io, socket, Service)
}
