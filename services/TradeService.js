const Account = require('../models/Account')
const AccountThing = require('../models/AccountThing')

class TradeService {
  // Данные страницы нового обмена
  async newTradePageData(account, username) {
    if (!account) {
      throw new Error('Не авторизован')
    }

    if (!username) {
      throw new Error('Нет необходимых данных')
    }

    const vizavi = await Account.findOne({ where: { username } })

    if (!vizavi) {
      throw new Error('Игрок с таким ником не найден')
    }

    // Мои вещи из инвентаря
    const myThings = await AccountThing.scope({
      method: ['withThings', account.id],
    }).findAll({ order: [['id', 'desc']] })

    // Вещи визави
    const vizaviThings = await AccountThing.scope({
      method: ['withThings', vizavi.id],
    }).findAll({ order: [['id', 'desc']] })

    const data = {
      vizavi,
      vizaviThings,
      myThings,
    }

    return data
  }
}

module.exports = new TradeService()
