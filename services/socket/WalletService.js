const WalletEvent = require("../../models/WalletEvents");
const BaseService = require("./BaseService");

class WalletService extends BaseService {
    // Пополнение счёта
    async payment(sum, method) {
        const { user } = this
        if (!user) {
            throw new Error("Не авторизован")
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
            throw new Error("Не авторизован")
        }

        const limit = WalletEvent.eventsOnPage
        const events = await WalletEvent.findAll({
            where: {
                accountId: user.id
            },
            order: [['id', 'DESC']],
            offset,
            limit
        })
        return events
    }
}

module.exports = WalletService