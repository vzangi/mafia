const { where } = require('sequelize')
const Account = require('../../models/Account')
const AccountThing = require('../../models/AccountThing')
const Thing = require('../../models/Thing')
const Trade = require('../../models/Trade')
const TradeItem = require('../../models/TradeItem')
const WalletEvent = require('../../models/WalletEvents')
const bot = require('../../units/bot')
const BaseService = require('./BaseService')

const isFloat = (n) => {
  return Number(n) === n && n % 1 !== 0
}

const isInt = (n) => {
  return Number(n) === n && n % 1 === 0
}

// Помечает обмены с переданной вещью отменёнными системой
const setTradesCancelled = async (thing) => {
  // Если были предложения обмена с этой вещью, то помечаю их отменёнными системой
  const items = await TradeItem.findAll({
    where: {
      accountthingId: thing.id
    },
    include: [
      {
        model: Trade,
        where: {
          status: 0
        }
      }
    ]
  })

  // Отмняю все обмены с этой вещью
  items.forEach(async (item) => {
    // 4 - отменён системой
    item.trade.status = 4
    await item.trade.save()
  })
}

class MarketService extends BaseService {
  // Покупка лота
  async buy(thingId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!thingId) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await AccountThing.findByPk(thingId, {
      include: [
        {
          model: Thing,
        },
      ],
    })

    if (!thing) {
      throw new Error('Лот не найден')
    }

    const seller = await Account.findByPk(thing.accountId)

    if (!seller) {
      throw new Error('Продавец не найден')
    }

    if (seller.id == user.id) {
      throw new Error('Покупаешь лот у самого себя? Серьёзно!?')
    }

    const account = await Account.findByPk(user.id)

    if (account.wallet < thing.marketPrice) {
      throw new Error(
        `На счету должно быть как мимнимум ${thing.marketPrice} рублей, чтобы купить этот лот`
      )
    }

    // Провожу покупку
    await WalletEvent.buyThing(user.id, thing)

    const notifyMessage = `${account.username} ${account.gender == 2 ? 'купила' : 'купил'
      } у тебя на маркете ${thing.thing.name} за ${thing.marketPrice * WalletEvent.sellingRate
      } р.`

    // Передаю лот покупателю
    thing.accountId = user.id
    thing.marketPrice = null
    await thing.save()

    // Создаю нотификацию
    this.notify(seller.id, notifyMessage)

    // Если подключена нотификация по telegram, то отправляем сообщение туда
    if (seller.telegramChatId && !seller.online) {
      bot.sendMessage(seller.telegramChatId, notifyMessage)
    }
  }

  // Продажа вещи
  async sell(thingId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!thingId) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await AccountThing.findByPk(thingId, {
      include: [{ model: Thing }],
    })

    if (!thing) {
      throw new Error('Вещь не найдена')
    }

    if (thing.accountId != user.id) {
      throw new Error('На чужое позарился!?')
    }

    // Продаю вещь
    await WalletEvent.sell(thing)

    // Удаляю вещь из инвентаря
    thing.accountId = null
    await thing.save()

    // Если были предложения обмена с этой вещью, то помечаю их отменёнными системой
    await setTradesCancelled(thing)
  }

  // Выставить вещь на маркет
  async sellOnMarket(thingId, marketPrice) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!thingId || !marketPrice) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await AccountThing.findByPk(thingId)

    if (!thing) {
      throw new Error('Вещь не найдена')
    }

    if (thing.accountId != user.id) {
      throw new Error('На чужое позарился!?')
    }

    marketPrice = marketPrice * 1
    if (!isInt(marketPrice) && !isFloat(marketPrice)) {
      throw new Error('Цена указана неверно')
    }

    thing.marketPrice = marketPrice.toFixed(2)
    await thing.save()

    // Пометить все обмены с этой вещью отменёнными
    await setTradesCancelled(thing)
  }

  // Вернуть лот в инвентарь
  async takeBack(thingId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!thingId) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await AccountThing.findByPk(thingId)

    if (!thing) {
      throw new Error('Лот не найден')
    }

    if (thing.accountId != user.id) {
      throw new Error('На чужое позарился!?')
    }

    thing.marketPrice = null
    await thing.save()
  }

  // Возвращает отфильтрованный список офферов из маркета
  async getList(types, classes, collections) {
    if (!types || !classes || !collections) {
      throw new Error('Нет необходимых данных')
    }

    const things = await AccountThing.getList(types, classes, collections)

    return things
  }
}

module.exports = MarketService
