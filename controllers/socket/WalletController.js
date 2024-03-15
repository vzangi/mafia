const BaseSocketController = require('./BaseSocketController')
const WalletEvent = require('../../models/WalletEvents')
const Service = require('../../services/socket/WalletService')

class WalletController extends BaseSocketController {
  // Пополнение счёта
  async payment(payData, callback) {
    try {
      const url = await this.service.payment(payData)
      callback({ status: 0, url })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Последние транзакции
  async transactions(offset = 0, callback) {
    try {
      const events = await this.service.transactions(offset)
      callback({ status: 0, events })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Перевод
  async transfer(username, count, comment, callback) {
    try {
      await this.service.transfer(username, count, comment)
      callback({ status: 0 })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new WalletController(io, socket, Service)
}
