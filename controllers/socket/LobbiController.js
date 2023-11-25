const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/LobbiService')

class LobbiController extends BaseSocketController {
  // Возвращаю вещь в инвентарь
  async makeGame(gametypeId, playersCount, waitingTime, description, callback) {
    try {
      const game = await this.service.makeGame(
        gametypeId,
        playersCount,
        waitingTime,
        description
      )
      callback({ status: 0, game })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new LobbiController(io, socket, Service)
}
