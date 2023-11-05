const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/MarketService')

class MarketController extends BaseSocketController {
  // Покупка лота
  async buy(offerId, callback) {
    try {
        await this.service.buy(offerId)
        callback({ status: 0 })
      } catch (error) {
        callback({ status: 1, msg: error.message })
      }
  }
}

module.exports = (io, socket) => {
  return new MarketController(io, socket, Service)
}
