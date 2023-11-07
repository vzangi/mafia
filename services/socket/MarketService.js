const Account = require('../../models/Account')
const AccountThing = require('../../models/AccountThing')
const Thing = require('../../models/Thing')
const WalletEvent = require('../../models/WalletEvents')
const bot = require('../../units/bot')
const BaseService = require('./BaseService')

const isFloat = (n) => {
  return Number(n) === n && n % 1 !== 0
}

const isInt = (n) => {
  return Number(n) === n && n % 1 === 0
}

class MarketService extends BaseService {
  async buy(offerId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!offerId) {
      throw new Error('Нет необходимых данных')
    }

    const offer = await AccountThing.findByPk(offerId, {
      include: [
        {
          model: Thing,
        },
      ],
    })

    if (!offer) {
      throw new Error('Лот не найден')
    }

    const seller = await Account.findByPk(offer.accountId)

    if (!seller) {
      throw new Error('Продавец не найден')
    }

    if (seller.id == user.id) {
      throw new Error('Покупаешь лот у самого себя? Серьёзно!?')
    }

    const account = await Account.findByPk(user.id)

    if (account.wallet < offer.marketPrice) {
      throw new Error(
        `На счету должно быть как мимнимум ${offer.marketPrice} рублей, чтобы купить этот лот`
      )
    }

    // Провожу покупку
    await WalletEvent.buyThing(user.id, offer)

    const notifyMessage = `${account.username} ${account.gender == 2 ? 'купила' : 'купил'
      } у вас на маркете ${offer.thing.name} за ${offer.marketPrice * WalletEvent.sellingRate
      } р.`

    // Передаю лот покупателю
    offer.accountId = user.id
    offer.marketPrice = null
    await offer.save()

    // Создаю нотификацию
    this.notify(seller.id, notifyMessage)

    // Если подключена нотификация по telegram, то отправляем сообщение туда
    if (seller.telegramChatId && !seller.online) {
      bot.sendMessage(seller.telegramChatId, notifyMessage)
    }
  }

  async sell(offerId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!offerId) {
      throw new Error('Нет необходимых данных')
    }

    const offer = await AccountThing.findByPk(offerId, {
      include: [{ model: Thing }],
    })

    if (!offer) {
      throw new Error('Вещь не найдена')
    }

    if (offer.accountId != user.id) {
      throw new Error('На чужое позарился!?')
    }

    // Продаю вещь
    await WalletEvent.sell(offer)

    // Удаляю вещь из инвентаря
    AccountThing.destroy({ where: { id: offerId } })
  }

  async sellOnMarket(offerId, marketPrice) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!offerId || !marketPrice) {
      throw new Error('Нет необходимых данных')
    }
    
    const offer = await AccountThing.findByPk(offerId)

    if (!offer) {
      throw new Error('Вещь не найдена')
    }

    if (offer.accountId != user.id) {
      throw new Error('На чужое позарился!?')
    }

    
    marketPrice = marketPrice * 1
    if (!isInt(marketPrice) && !isFloat(marketPrice)) {
      throw new Error('Цена указана неверно')
    }

    offer.marketPrice = marketPrice
    await offer.save()
  }
}

module.exports = MarketService
