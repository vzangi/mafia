const Account = require('../../models/Account')
const AccountThing = require('../../models/AccountThing')
const Thing = require('../../models/Thing')
const WalletEvent = require('../../models/WalletEvents')
const bot = require('../../units/bot')
const BaseService = require('./BaseService')

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
                    model: Thing
                }
            ]
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
            throw new Error(`На счету должно быть как мимнимум ${offer.marketPrice} рублей, чтобы купить этот лот`)
        }

        // Провожу покупку
        await WalletEvent.buyThing(user.id, offer)

        const notifyMessage = `${account.username} купил у вас на маркете ${offer.thing.name} за ${offer.marketPrice * WalletEvent.sellingRate} р.`

        // Передаю лот покупателю
        offer.accountId = user.id
        offer.marketPrice = null
        await offer.save()

        // Создаю нотификацию
        this.notify(seller.id, notifyMessage)

        // Если подключена нотификация по telegram, то отправляем сообщение туда
        if (seller.telegramChatId && !seller.online) {
            bot.sendMessage(
                seller.telegramChatId,
                notifyMessage
            )
        }
    }
}

module.exports = MarketService
