const { Op } = require('sequelize')
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
      accountthingId: thing.id,
    },
    include: [
      {
        model: Trade,
        where: {
          status: 0,
        },
      },
    ],
  })

  // Отмняю все обмены с этой вещью
  items.forEach(async (item) => {
    // 4 - отменён системой
    item.trade.status = Trade.statuses.SYS_DECLINE
    await item.trade.save()
  })
}

class MarketService extends BaseService {
  // Покупка VIP статуса
  async buyVip(item) {
    if (item != 1 && item != 2) throw new Error('Неверные данные')
    const { user } = this

    const price = item == 1 ? 60 : 150

    if (!user)
      throw new Error('Чтобы купить пропуск - необходимо авторизоваться')

    const acc = await Account.findOne({
      where: { id: user.id },
      attributes: ['wallet'],
    })

    if (acc.wallet < price)
      throw new Error('В кошельке не хватает средств, чтобы купить пропуск')

    // Провожу оплату
    await WalletEvent.buyItem(user.id, price, item)

    // Создаю в инвентаре вещь
    const thing = await AccountThing.create({
      accountId: user.id,
      thingId: item,
    })

    return 'Покупка успешно совершена. VIP пропуск в вашем инвентаре.'
  }

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

    if (thing.marketPrice == null) {
      throw new Error('Лот снят с продажи')
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
        `На счету должно быть как минимум ${thing.marketPrice} рублей, чтобы купить этот лот`
      )
    }

    // Провожу покупку
    await WalletEvent.buyThing(user.id, thing)

    const notifyMessage = `${account.username} ${
      account.gender == Account.genders.FEMALE
        ? 'купила'
        : account.gender == Account.genders.MALE
        ? 'купил'
        : 'купил(а)'
    } у вас на маркете ${thing.thing.name} за ${(
      thing.marketPrice * WalletEvent.sellingRate
    ).toFixed(2)} р.`

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

  // Покупка лота в системе
  async buyFromSystem(thingId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!thingId) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await Thing.findByPk(thingId)

    if (!thing) {
      throw new Error('Лот не найден')
    }

    if (thing.systemPrice == 0)
      throw new Error('Нельзя купить этот лот в системе')

    const account = await Account.findByPk(user.id)

    if (account.wallet < thing.systemPrice) {
      throw new Error(
        `На счету должно быть как минимум ${thing.systemPrice} рублей, чтобы купить этот лот`
      )
    }

    // Провожу покупку
    await WalletEvent.buyItem(user.id, thing.systemPrice, thingId)

    await AccountThing.create({
      accountId: user.id,
      thingId,
    })
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
    thing.taked = false
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

  // Полчуение минимальной цены вещи на маркете
  async getMinPrice(thingId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!thingId) {
      throw new Error('Нет необходимых данных')
    }

    const minPriceItem = await AccountThing.findOne({
      where: {
        marketPrice: { [Op.ne]: null },
        accountId: { [Op.ne]: null },
        thingId,
      },
      order: [['marketPrice']],
    })

    if (!minPriceItem) return 0

    return minPriceItem.marketPrice
  }
}

module.exports = MarketService
