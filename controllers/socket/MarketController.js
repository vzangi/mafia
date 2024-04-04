const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/MarketService')
const log = require('../../units/customLog')

class MarketController extends BaseSocketController {
  // Покупка лота
  async buy(offerId, callback) {
    try {
      await this.service.buy(offerId)
      if (callback) callback({ status: 0 })
    } catch (error) {
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Продажа вещи
  async sell(offerId, callback) {
    try {
      await this.service.sell(offerId)
      if (callback) callback({ status: 0 })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Выставить вещь на маркет
  async sellOnMarket(offerId, marketPrice, callback) {
    try {
      await this.service.sellOnMarket(offerId, marketPrice)
      if (callback) callback({ status: 0 })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Вернуть лот в инвентарь
  async takeBack(offerId, callback) {
    try {
      await this.service.takeBack(offerId)
      if (callback) callback({ status: 0 })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Возвращает отфильтрованный список офферов из маркета
  async getList(types, classes, collections, callback) {
    try {
      const offers = await this.service.getList(types, classes, collections)
      if (callback) callback({ status: 0, offers })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Полчуение минимальной цены вещи на маркете
  async getMinPrice(thingId, callback) {
    try {
      const minPrice = await this.service.getMinPrice(thingId)
      if (callback) callback({ status: 0, minPrice })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new MarketController(io, socket, Service)
}
