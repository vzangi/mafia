const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/TradesService')

class TradesController extends BaseSocketController {
  // Новый обмен
  async newTrade(vizaviId, myThings, vizaviThings, callback) {
    try {
      await this.service.newTrade(vizaviId, myThings, vizaviThings)
      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Отмена предложения
  async decline(tradeId, callback) {
    try {
      await this.service.decline(tradeId)
      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new TradesController(io, socket, Service)
}
