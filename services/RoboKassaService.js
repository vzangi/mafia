const Notification = require('../models/Notification')
const Payment = require('../models/Payment')
const WalletEvent = require('../models/WalletEvents')
const md5 = require('md5')

class RoboKassaService {
  // Пришёл ответ от Robokassa на тестовую оплату
  async testResultResponse(data) {
    if (!data) throw new Error('No data')

    const { InvId } = data

    const payment = await Payment.findOne({ where: { id: InvId } })

    if (payment) {
      payment.status = 'pinned'
      await payment.save()
    }

    return InvId
  }

  // Пришёл ответ от Robokassa на тестовую оплату
  async testSuccessResponse(data) {
    if (!data) throw new Error('No data')

    const { InvId } = data

    const payment = await Payment.findOne({ where: { id: InvId } })

    if (!payment) throw new Error('Платёж не найден')

    if (payment.status != 'pinned') return

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

    console.log(data)

    const { InvId, OutSum, SignatureValue } = data

    if (!InvId || !OutSum || !SignatureValue)
      throw new Error('Нет необходимых данных в ответе Robokassa')

    const pass2 = process.env.RK_PASS_2 || '123'

    const payment = await Payment.findOne({ where: { id: InvId } })

    if (!payment) throw new Error(`Платёж ${InvId} не найден`)

    // Контрольная сумма

    const d = `${OutSum}:${InvId}:${pass2}`

    const hash = md5(d).toUpperCase()

    console.log(hash, d)

    if (hash != SignatureValue) throw new Error(`Контрольная сумма не верна`)

    //await WalletEvent.payment(accountId, amount)

    return InvId
  }
}

module.exports = new RoboKassaService()
