const Account = require('../models/Account')
const AccountThing = require('../models/AccountThing')
const ThingType = require('../models/ThingType')
const Thing = require('../models/Thing')
const Trade = require('../models/Trade')
const TradeItem = require('../models/TradeItem')

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

    const types = await ThingType.findAll({
      order: [['sort']],
    })

    const data = {
      vizavi,
      vizaviThings,
      myThings,
      types,
    }

    return data
  }

  // Список новых обменов
  async tradesList(account) {
    if (!account) {
      throw new Error('Не авторизован')
    }

    const trades = await Trade.findAll({
      where: {
        toId: account.id,
        status: 0,
      },
      include: [
        { model: Account, as: 'from' },
        {
          model: TradeItem,
          include: [
            { model: Trade },
            {
              model: AccountThing,
              include: [{ model: Thing }],
            },
            { model: Account },
          ],
        },
      ],
      order: [['createdAt', 'desc']],
    })

    const data = {
      trades,
    }

    return data
  }
}

module.exports = new TradeService()
