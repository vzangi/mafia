const Notification = require('../models/Notification')
const Payment = require('../models/Payment')
const WalletEvent = require('../models/WalletEvents')

class RoboKassaService {
  // Пришёл ответ от Robokassa на тестовую оплату
  async testResultResponse(data) {
    if (!data) throw new Error('No data')

    console.log('result', data)

    const { InvId } = data

    return InvId
  }

  // Пришёл ответ от Robokassa на тестовую оплату
  async testSuccessResponse(data) {
    if (!data) throw new Error('No data')

    const { InvId } = data

    const payment = await Payment.findOne({ where: { id: InvId } })

    if (!payment) throw new Error('Платёж не найден')

    if (payment.status == 'success')
      throw new Error(`Платёж #${InvId} ранее уже был проведён`)

    // Сохраняю статус платежа
    payment.status = 'success'
    await payment.save()

    const { accountId, amount } = payment

    const message = `Ваш кошелёк пополнен на ${amount} рублей`

    // Отправляю нотификацию
    const newNotify = await Notification.create({
      accountId,
      message,
      level: 1,
    })

    await WalletEvent.payment(accountId, amount)

    console.log('success', data)
  }

  // Пришёл ответ от Robokassa на тестовую оплату
  async testFailResponse(data) {
    if (!data) throw new Error('No data')

    console.log('fail', data)
  }

  // Пришёл ответ от Robokassa на оплату
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

module.exports = new RoboKassaService()
