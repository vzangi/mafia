const Notification = require('../models/Notification')
const Payment = require('../models/Payment')
const WalletEvent = require('../models/WalletEvents')

class YooKassaService {
	// Пришёл ответ от ЮМоney на тестовую оплату
	async testResponse(data) {
		if (!data) throw new Error('No data')

		const { event, object } = data

		if (!event || !object) throw new Error('No data')
		if (event != 'payment.succeeded') {
			console.log(data)
			throw new Error(`Статус нотификации: ${event}`)
		}
		const { id, status } = object

		if (!status || !id) throw new Error('No data')
		if (status != 'succeeded') throw new Error(`Статус оплаты: ${status}`)

		const payment = await Payment.findOne({ where: { pid: id } })

		if (!payment) throw new Error('Платёж не найден')

		if (payment.status == status)
			throw new Error(`Платёж #${id} ранее уже был проведён`)

		// Сохраняю статус платежа
		payment.status = status
		await payment.save()

		const { accountId, amount } = payment

		// Зачисляю средства на счёт
		//await WalletEvent.payment(accountId, amount)

		const message = `Ваш кошелёк пополнен на ${amount} рублей`

		// Отправляю нотификацию
		const newNotify = await Notification.create({
			accountId,
			message,
			level: 1,
		})
	}

	// Пришёл ответ от ЮМоney на оплату
	async response(data) {
		if (!data) throw new Error('No data')

		const { event, object } = data

		if (!event || !object) throw new Error('No data')
		const { id, status } = object

		// Если статус - отменён
		if (event == 'payment.canceled') {
			await Payment.update(
				{
					status: 'canceled',
				},
				{ where: { pid: id } }
			)
			return
		}

		if (event != 'payment.succeeded') {
			console.log(data)
			throw new Error(`Статус нотификации: ${event}`)
		}

		if (!status || !id) throw new Error('No data')
		if (status != 'succeeded') throw new Error(`Статус оплаты: ${status}`)

		const payment = await Payment.findOne({ where: { pid: id } })

		if (!payment) throw new Error('Платёж не найден')

		if (payment.status == status)
			throw new Error(`Платёж #${id} ранее уже был проведён`)

		// Сохраняю статус платежа
		payment.status = status
		await payment.save()

		const { accountId, amount } = payment

		// Зачисляю средства на счёт
		await WalletEvent.payment(accountId, amount)

		const message = `Ваш кошелёк пополнен на ${amount} рублей`

		// Отправляю нотификацию
		const newNotify = await Notification.create({
			accountId,
			message,
			level: 1,
		})
	}
}

module.exports = new YooKassaService()
