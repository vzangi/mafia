const { Op } = require('sequelize')
const Account = require('../../models/Account')
const Thing = require('../../models/Thing')
const Payment = require('../../models/Payment')
const WalletEvent = require('../../models/WalletEvents')
const bot = require('../../units/bot')
const BaseService = require('./BaseService')
const htmlspecialchars = require('htmlspecialchars')
const axios = require('axios')
const md5 = require('md5')

const minPaymentSumm = 50
const maxPaymentSumm = 15000

const minTransferSumm = 1
const maxTransferSumm = 5000

class WalletService extends BaseService {
  // Пополнение счёта
  async payment(payData) {
    let { sum, method } = payData
    const { user } = this
    if (!user) throw new Error('Не авторизован')

    sum = sum * 1
    if (sum < minPaymentSumm || sum > maxPaymentSumm)
      throw new Error('Неверная сумма')

    payData.accountId = user.id

    const data = await this._YooKassaRequest(payData)

    return data
  }

  // Запрос к YooKassa на создание платежа
  async _YooKassaRequest(payData) {
    const { sum, accountId } = payData

    const account = await Account.findByPk(accountId)

    if (!account) throw new Error('Аккаунт не найден')

    const url = 'https://api.yookassa.ru/v3/payments'

    const payload = {
      amount: {
        value: sum,
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: 'https://mafia-one.com/profile/wallet',
      },
      receipt: {
        customer: {
          email: account.email,
        },
        items: [
          {
            description: 'Пополнение кошелька',
            amount: {
              value: sum,
              currency: 'RUB',
            },
            vat_code: 1,
            quantity: 1,
          },
        ],
      },
      description: `Пополнение кошелька ${account.username} на ${sum} руб.`,
    }

    const storeId = process.env.STORE_ID
    const secretKey = process.env.PAYMENT_SECRET_KEY
    const ikey = `${accountId}-${this._v4rnd()}-${this._v4rnd()}`

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotence-Key': ikey,
      },
      auth: {
        username: storeId,
        password: secretKey,
      },
    }

    const { data } = await axios.post(url, payload, options)

    const { id, status, amount, description, confirmation } = data

    if (!id || !confirmation) {
      throw new Error('Что-то пошло не так')
    }

    const payment = {
      accountId,
      pid: id,
      status,
      description,
      amount: amount.value * 1,
    }

    await Payment.create(payment)

    return confirmation.confirmation_url
  }

  _v4rnd() {
    return Math.ceil(Math.random() * 1000)
  }

  // Пополнение счёта
  async paymentEuro(payData) {
    let { sum, method } = payData
    const { user } = this
    if (!user) throw new Error('Не авторизован')

    sum = sum * 1
    if (sum < minPaymentSumm || sum > maxPaymentSumm)
      throw new Error('Неверная сумма')

    payData.accountId = user.id

    const data = await this._RoboKassaRequest(payData)

    return data
  }

  // Ссылка для пополнения в робокассе
  async _RoboKassaRequest(payData) {
    const { sum, accountId } = payData

    const account = await Account.findByPk(accountId)

    if (!account) throw new Error('Аккаунт не найден')

    const url = 'https://auth.robokassa.ru/Merchant/Index.aspx?'

    const login = 'mafiaone'

    const pass1 = process.env.RK_PASS_1 || ''

    const invid = `${accountId}-${this._v4rnd()}-${this._v4rnd()}`

    const description = `Пополнение кошелька ${account.username} на ${sum} руб.`

    const signature = md5(`${login}:${sum}:${invid}:${pass1}`)

    const pay_url = `${url}MerchantLogin=${login}&OutSum=${sum}&InvoiceID=${invid}&Description=${description}&SignatureValue=${signature}`

    const payment = {
      accountId,
      pid: invid,
      status: '',
      description,
      amount: sum,
    }

    await Payment.create(payment)

    return pay_url
  }

  // Последние транзакции
  async transactions(offset = 0) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const limit = WalletEvent.eventsOnPage
    const events = await WalletEvent.findAll({
      where: {
        accountId: user.id,
      },
      include: [{ model: Thing }],
      order: [['id', 'DESC']],
      offset,
      limit,
    })
    return events
  }

  // Перевод
  async transfer(username, count, comment) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!username) {
      throw new Error('Нет необходимых данных')
    }
    count = count * 1
    if (count < minTransferSumm || count > maxTransferSumm) {
      throw new Error('Неверная сумма')
    }

    const recipient = await Account.findOne({
      where: {
        username,
        status: {
          [Op.ne]: 0,
        },
      },
    })

    if (!recipient) {
      throw new Error('Получатель не найден, перевод не состоялся')
    }

    if (recipient.id == user.id) {
      throw new Error('Перевод самому себе? Серьёзно!?')
    }

    const account = await Account.findByPk(user.id)

    if (!recipient) {
      throw new Error('Отправитель не найден, перевод не состоялся')
    }

    if (account.wallet < count * WalletEvent.transferRate) {
      throw new Error('На счету не хватает средств для совершения перевода')
    }

    comment = htmlspecialchars(comment)
    if (comment.length > 255) {
      comment = comment.substr(0, 255)
    }

    await WalletEvent.transfer(user.id, recipient.id, count, comment)

    const notifyText = `${account.username} ${
      account.gender == Account.genders.FEMALE ? 'перевела' : 'перевёл'
    } вам ${count} рублей c комментарием: ${comment}`

    // Отправляю уведомление другу
    this.notify(recipient.id, notifyText)

    // Если подключена нотификация по telegram, то отправляем сообщение туда
    if (recipient.telegramChatId && !recipient.online) {
      bot.sendMessage(recipient.telegramChatId, notifyText)
    }
  }
}

module.exports = WalletService
