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

  // Продажа вещи
  async sell(offerId, callback) {
    try {
      await this.service.sell(offerId)
      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Выставить вещь на маркет
  async sellOnMarket(offerId, marketPrice, callback) {
    try {
      await this.service.sellOnMarket(offerId, marketPrice)
      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Вернуть лот в инвентарь
  async takeBack(offerId, callback) {
    try {
      await this.service.takeBack(offerId)
      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new MarketController(io, socket, Service)
}
