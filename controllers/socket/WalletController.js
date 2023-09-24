const BaseSocketController = require('./BaseSocketController')
const WalletEvent = require('../../models/WalletEvents')

class WalletController extends BaseSocketController {

  // Пополнение счёта
  async payment(sum, method, callback) {
    sum = sum * 1
    if (sum < 50 || sum > 15000) callback({ status: 1, msg: 'Неверная сумма' })

    const { user } = this
    if (!user) return callback({ status: 2, msg: 'Неавторизованный запрос' })

    try {
      await WalletEvent.payment(user.id, sum)
    } catch (error) {
      console.log(error)
      return callback({ status: 3, msg: 'Ошибка при пополнении кошелька' })
    }

    callback({ status: 0, msg: `Кошелёк пополнен на ${sum} рублей` })
  }

  // Последние транзакции
  async transactions(offset = 0, callback) {
    const limit = WalletEvent.eventsOnPage
    const { user } = this
    const events = await WalletEvent.findAll({
      where: {
        accountId: user.id
      },
      order: [['id', 'DESC']],
      offset,
      limit
    })
    callback(events)
  }
}

module.exports = (io, socket) => {
  return new WalletController(io, socket)
}
