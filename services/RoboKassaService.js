const Notification = require('../models/Notification')
const Payment = require('../models/Payment')
const WalletEvent = require('../models/WalletEvents')
const md5 = require('md5')

class RoboKassaService {
  // Пришёл ответ от Robokassa на тестовую оплату
  async testResultResponse(data) {
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

  // Пришёл ответ от Robokassa на оплату
  async response(data) {
    if (!data) throw new Error('No data')

    const { InvId, OutSum, SignatureValue } = data

    if (!InvId || !OutSum || !SignatureValue)
      throw new Error('Нет необходимых данных в ответе Robokassa')

    const pass2 = process.env.RK_PASS_2 || ''

    // Беру платёж по номеру
    const payment = await Payment.findOne({ where: { id: InvId } })
    if (!payment) throw new Error(`Платёж ${InvId} не найден`)

    // Контрольная сумма
    const d = `${OutSum}:${InvId}:${pass2}`
    const hash = md5(d).toUpperCase()

    if (hash != SignatureValue) throw new Error(`Контрольная сумма не верна`)

    // Зачисляю средства в кошелёк
    await WalletEvent.payment(payment.accountId, payment.amount)
    payment.status = 'success'
    await payment.save()

    return InvId
  }
}

module.exports = new RoboKassaService()
