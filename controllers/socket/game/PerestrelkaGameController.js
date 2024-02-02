const BaseGameController = require('./BaseGameController')
const Service = require('../../../services/socket/game/PerestrelkaGameService')

class PerestrelkaGameController extends BaseGameController {
  // Защита игрока от выстрела мафии
  async therapy(username) {
    try {
      await this.service.therapy(username)
    } catch (error) {
      console.log(error)
    }
  }
}

module.exports = (io, socket) => {
  return new PerestrelkaGameController(io, socket, Service)
}
