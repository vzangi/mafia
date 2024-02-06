const { Op } = require('sequelize')
const Account = require('../../models/Account')
const Thing = require('../../models/Thing')
const WalletEvent = require('../../models/WalletEvents')
const bot = require('../../units/bot')
const BaseService = require('./BaseService')
const htmlspecialchars = require('htmlspecialchars')

const minPaymentSumm = 50
const maxPaymentSumm = 15000

const minTransferSumm = 1
const maxTransferSumm = 5000

class WalletService extends BaseService {
  // Пополнение счёта
  async payment(sum, method) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    sum = sum * 1
    if (sum < minPaymentSumm || sum > maxPaymentSumm) {
      throw new Error('Неверная сумма')
    }

    throw new Error('Лафа кончилась)')

    await WalletEvent.payment(user.id, sum)
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
