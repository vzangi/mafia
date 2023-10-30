const WalletEvent = require('../../models/WalletEvents')
const Account = require('../../models/Account')
const BaseService = require('./BaseService')
const { Op } = require('sequelize')

class WalletService extends BaseService {
  // Пополнение счёта
  async payment(sum, method) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    sum = sum * 1
    if (sum < 50 || sum > 15000) {
      throw new Error('Неверная сумма')
    }

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
      order: [['id', 'DESC']],
      offset,
      limit,
    })
    return events
  }

  // Перевод
  async transfer(username, count) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!username) {
      throw new Error('Нет необходимых данных')
    }
    count = count * 1
    if (count < 1 || count > 5000) {
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

    await WalletEvent.transfer(user.id, recipient.id, count)

    // Отправляю уведомление другу
    this.notify(
      recipient.id,
      `${account.username} ${
        account.gender == Account.genders.FEMALE ? 'перевела' : 'перевёл'
      } тебе ${count} рублей`
    )
  }
}

module.exports = WalletService
