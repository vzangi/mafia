const BaseSocketController = require('./BaseSocketController')
const WalletEvent = require('../../models/WalletEvents')
const Service = require('../../services/socket/WalletService')

class WalletController extends BaseSocketController {
	// Пополнение счёта
	async payment(payData, callback) {
		try {
			const url = await this.service.payment(payData)
			if (callback) callback({ status: 0, url })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}
	// Пополнение счёта
	async paymentEuro(payData, callback) {
		try {
			const url = await this.service.paymentEuro(payData)
			if (callback) callback({ status: 0, url })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Последние транзакции
	async transactions(offset = 0, callback) {
		try {
			const events = await this.service.transactions(offset)
			if (callback) callback({ status: 0, events })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}

	// Перевод
	async transfer(username, count, comment, callback) {
		try {
			await this.service.transfer(username, count, comment)
			if (callback) callback({ status: 0 })
		} catch (error) {
			if (callback) callback({ status: 1, msg: error.message })
		}
	}
}

module.exports = (io, socket) => {
	return new WalletController(io, socket, Service)
}
