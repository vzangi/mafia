const { Op } = require('sequelize')
const Account = require('../../models/Account')
const Thing = require('../../models/Thing')
const WalletEvent = require('../../models/WalletEvents')
const bot = require('../../units/bot')
const BaseService = require('./BaseService')
const htmlspecialchars = require('htmlspecialchars')
const axios = require('axios')

const minPaymentSumm = 50
const maxPaymentSumm = 15000

const minTransferSumm = 1
const maxTransferSumm = 5000

class WalletService extends BaseService {
  // Пополнение счёта
  async payment(payData) {
    const { sum, method } = payData
    const { user } = this
    if (!user) throw new Error('Не авторизован')

    sum = sum * 1
    if (sum < minPaymentSumm || sum > maxPaymentSumm)
      throw new Error('Неверная сумма')

    if (user.id != 1) throw new Error('Скоро...')

    payData.accountId = user.id

    const data = await this._YooKassaRequest(payData)

    return data

    // await WalletEvent.payment(user.id, sum)
  }

  async _YooKassaRequest(payData) {
    const { sum, accountId } = payData

    const account = await Account.findByPk(accountId)

    if (!account) throw new Error('Аккаунт не найден')

    const payload = {
      amount: {
        value: sum,
        currency: 'RUB',
      },
      capture: true,
      confirmation: {
        type: 'redirect',
        return_url: 'https://mafia-one.com/return_url',
      },
      description: `Пополнение кошелька ${account.username} на ${sum} руб.`,
    }

    const storeId = process.env.STORE_ID
    const secretKey = process.env.PAYMENT_SECRET_KEY
    const url = 'https://api.yookassa.ru/v3/payments'
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

    console.log(payload, options)

    const { data } = await axios.post(url, payload, options)

    console.log(data)

    return data
  }

  _v4rnd() {
    return Math.ceil(Math.random() * 1000)
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
