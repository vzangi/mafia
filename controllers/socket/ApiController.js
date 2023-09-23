const Account = require('../../models/Account')
const smiles = require('../../units/smiles')
const BaseSocketController = require('./BaseSocketController')
const WalletEvent = require('../../models/WalletEvents')
const sequelize = require('../../units/db')

class ApiController extends BaseSocketController {
  // Поиск пользователей по нику
  searchUsersByNik(nik, callback) {
    Account.findAccountsByNik(nik).then((accounts) => {
      callback(accounts)
    })
  }

  // Возвращаю список доступных смайлов
  smiles(callback) {
    callback(smiles)
  }

  // Пополнение счёта
  async payment(sum, method, callback) {
    sum = sum * 1
    if (sum < 50 || sum > 15000) callback({ status: 1, msg: 'Неверная сумма' })

    const { user } = this
    if (!user) return callback({ status: 2, msg: 'Неавторизованный запрос' })

    const t = await sequelize.transaction()

    try {

      await WalletEvent.create({
        accountId: user.id,
        eventType: WalletEvent.events.PAYMENT,
        value: sum,
      }, { transaction: t })

      await Account.increment('wallet', {
        by: sum,
        where: { id: user.id },
        transaction: t
      })

      t.commit()

    } catch (error) {
      console.log(error)
      await t.rollback()
      return callback({ status: 3, msg: 'Ошибка при пополнении кошелька' })
    }

    callback({ status: 0, msg: `Кошелёк пополнен на ${sum} рублей` })
  }

  // Последние транзакции
  async transactions(offset = 0, callback) {
    const limit = 20
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
  return new ApiController(io, socket)
}
