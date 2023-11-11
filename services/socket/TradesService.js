const Account = require("../../models/Account");
const AccountThing = require("../../models/AccountThing");
const Trade = require("../../models/Trade");
const TradeItem = require("../../models/TradeItem");
const bot = require('../../units/bot');
const sequelize = require("../../units/db");
const BaseService = require("./BaseService");

// Добавляю в обмен предложенные вещи
const addItemsToTrade = async (tradeId, items, accountId, t) => {
    for (let id of items) {
        const accountThing = await AccountThing.findOne({
            where: { id, accountId }
        })

        if (!accountThing) {
            throw new Error("Одна из вещей не найдена в инвентаре")
        }

        if (accountThing.marketPrice) {
            throw new Error("Одна из вещей была выставлена на продажу и временно недоступна для обмена")
        }

        //   const inTrades = await TradeItem.findOne({
        //     where: {
        //       accountthingId: id
        //     },
        //     include: [
        //       {
        //         model: Trade,
        //         where: { status: 0 },
        //       },
        //     ]
        //   })

        //   if (inTrades) {
        //     throw new Error("Одна из вещей находится в другом предложении обмена")
        //   }

        await TradeItem.create(
            { tradeId, accountthingId: id, accountId },
            { transaction: t })
    }
}

// Транзакция предложения обмена
const newTradeTransaction = async (fromId, toId, fromItems, toItems) => {
    // Использую транзакцию
    const t = await sequelize.transaction()
    try {
        // Создаю обмен
        const trade = await Trade.create({ fromId, toId }, { transaction: t })

        // Добавляю в обмен предложенные вещи
        await addItemsToTrade(trade.id, fromItems, fromId, t)

        // Добавляю в обмен запрошенные вещи 
        await addItemsToTrade(trade.id, toItems, toId, t)

        // Если всё впорядке - завершаю транзакцию
        await t.commit()

    } catch (error) {
        console.log(error)

        // Если произошла ошибка - отменяю транзакцию
        await t.rollback()

        // и возвращаю ошибку на предыдущий уровень
        throw new Error(error)
    }
}

class TradesService extends BaseService {
    // Новый обмен
    async newTrade(vizaviId, myThings, vizaviThings) {
        const { user, socket } = this
        if (!user) {
            throw new Error("Не авторизован")
        }
        if (!vizaviId || !myThings || !vizaviThings) {
            throw new Error("Нет необходимых данных")
        }

        if (vizaviId == user.id) {
            throw new Error("Предложение самому себе? Серьёзно!?")
        }

        const myAccount = await Account.findByPk(user.id)

        if (!myAccount) {
            throw new Error("Твой аккаунт не найден...")
        }

        const vizaviAccount = await Account.findByPk(vizaviId)

        if (!vizaviAccount) {
            throw new Error("Аккаунт не найден")
        }

        // Создаю обмен
        await newTradeTransaction(user.id, vizaviAccount.id, myThings, vizaviThings)

        const tradeMsg = `${myAccount.username} предлагает обмен`

        // Создаю нотификацию
        this.notify(vizaviId, tradeMsg)

        // Уведомляю о новом обмене
        const vizaviIds = this.getUserSocketIds(vizaviId)
        vizaviIds.forEach((sid) => {
            socket.broadcast.to(sid).emit('trade.new', tradeMsg)
        })

        // Если подключена нотификация по telegram, то отправляю сообщение туда
        if (vizaviAccount.telegramChatId && !vizaviAccount.online) {
            bot.sendMessage(
                vizaviAccount.telegramChatId,
                tradeMsg,
            )
        }
    }
}

module.exports = TradesService