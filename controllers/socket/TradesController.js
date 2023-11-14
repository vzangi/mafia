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

  // Отмена предложения
  async accept(tradeId, callback) {
    try {
      const cancelledTrades = await this.service.accept(tradeId)
      callback({ status: 0, cancelledTrades })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Получение истории обменов
  async history(callback) {
    try {
      const trades = await this.service.history()
      callback({ status: 0, trades })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Отправленные предложения
  async sended(callback) {
    try {
      const sendedTrades = await this.service.sended()
      callback({ status: 0, sendedTrades })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Отзыв предложения
  async cancel(tradeId, callback) {
    try {
      await this.service.cancel(tradeId)
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
