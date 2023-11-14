const { Op } = require('sequelize')
const Account = require('../../models/Account')
const AccountThing = require('../../models/AccountThing')
const Trade = require('../../models/Trade')
const TradeItem = require('../../models/TradeItem')
const bot = require('../../units/bot')
const sequelize = require('../../units/db')
const BaseService = require('./BaseService')
const Thing = require('../../models/Thing')

// Добавляю в обмен предложенные вещи
const addItemsToTrade = async (tradeId, items, accountId, t) => {
  for (let id of items) {
    const accountThing = await AccountThing.findOne({
      where: { id, accountId },
    })

    if (!accountThing) {
      throw new Error('Одна из вещей не найдена в инвентаре')
    }

    if (accountThing.marketPrice) {
      throw new Error(
        'Одна из вещей была выставлена на продажу и временно недоступна для обмена'
      )
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
      { transaction: t }
    )
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
      throw new Error('Не авторизован')
    }
    if (!vizaviId || !myThings || !vizaviThings) {
      throw new Error('Нет необходимых данных')
    }

    if (vizaviId == user.id) {
      throw new Error('Предложение самому себе? Серьёзно!?')
    }

    const myAccount = await Account.findByPk(user.id)

    if (!myAccount) {
      throw new Error('Твой аккаунт не найден...')
    }

    const vizaviAccount = await Account.findByPk(vizaviId)

    if (!vizaviAccount) {
      throw new Error('Аккаунт не найден')
    }

    // Создаю обмен
    await newTradeTransaction(user.id, vizaviAccount.id, myThings, vizaviThings)

    const tradeMsg = `${myAccount.username} предлагает обмен`

    // Создаю нотификацию
    this.notify(vizaviId, tradeMsg)

    // Количество запросов на обмен
    const count = await Trade.count({
      where: {
        toId: vizaviId,
        status: 0,
      },
    })

    // Уведомляю о новом обмене
    const vizaviIds = this.getUserSocketIds(vizaviId)
    vizaviIds.forEach((sid) => {
      socket.broadcast.to(sid).emit('trade.new', tradeMsg)
      socket.broadcast.to(sid).emit('trades.new', count)
    })

    // Если подключена нотификация по telegram, то отправляю сообщение туда
    if (vizaviAccount.telegramChatId && !vizaviAccount.online) {
      bot.sendMessage(vizaviAccount.telegramChatId, tradeMsg)
    }
  }

  // Отмена предложения
  async decline(tradeId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!tradeId) {
      throw new Error('Нет необходимых данных')
    }

    const trade = await Trade.findByPk(tradeId)

    if (!trade) {
      throw new Error('Предложение обмена не найдено')
    }

    if (trade.toId != user.id) {
      throw new Error('Нельзя отменить чужой обмен')
    }

    if (trade.status != 0) {
      throw new Error('Нельзя отменить неактивный обмен')
    }

    trade.status = 3
    await trade.save()
  }

  // Подтверждение обмена
  async accept(tradeId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!tradeId) {
      throw new Error('Нет необходимых данных')
    }

    const account = await Account.findByPk(user.id)

    // Беру обмен со всеми предметами
    const trade = await Trade.findByPk(tradeId, {
      include: [
        {
          model: TradeItem,
          include: [{ model: AccountThing }],
        },
      ],
    })

    if (!trade) {
      throw new Error('Предложение обмена не найдено')
    }

    if (trade.toId != user.id) {
      throw new Error('Нельзя принять чужой обмен')
    }

    if (trade.status != 0) {
      throw new Error('Нельзя принять завершённый обмен')
    }

    // Помечаю обмен принятым
    trade.status = 2
    await trade.save()

    const { fromId, toId } = trade

    // Обмениваю предметы
    for (let item of trade.tradeitems) {
      item.accountthing.accountId =
        item.accountthing.accountId == fromId ? toId : fromId
      await item.accountthing.save()
    }

    // Буфер для хранения id обменов
    // которые надо отменить
    const cancelledTrades = []

    // Ищу обмены, которые надо отменить
    for (let item of trade.tradeitems) {
      const mustCancelledTrades = await Trade.findAll({
        where: {
          status: 0,
        },
        include: [
          {
            model: TradeItem,
            where: {
              accountthingId: item.accountthingId,
            },
          },
        ],
      })
      for (let mcTrade of mustCancelledTrades) {
        cancelledTrades.push(mcTrade.id)
        // Помечаю обмен отменённым системой
        mcTrade.status = 4
        await mcTrade.save()
      }
    }

    const notifyMsg = `${account.username} принял твой обмен`

    this.notify(fromId, notifyMsg)

    // Возвращаю список отменённых обменов
    return cancelledTrades
  }

  // Получение истории обменов
  async history() {
    const { user, socket } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const tradesHistory = await Trade.findAll({
      where: {
        status: {
          [Op.ne]: 0,
        },
        [Op.or]: [{ toId: user.id }, { fromId: user.id }],
      },
      attributes: ['id', 'status', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Account,
          as: 'from',
          attributes: ['username', 'avatar'],
        },
        {
          model: Account,
          as: 'to',
          attributes: ['username', 'avatar'],
        },
        {
          model: TradeItem,
          attributes: ['id'],
          include: [
            {
              model: Account,
              attributes: ['username'],
            },
            {
              model: AccountThing,
              attributes: ['id'],
              include: [
                {
                  model: Thing,
                  attributes: ['name', 'picture', 'thingclassId'],
                },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'desc']],
    })

    const { username } = socket.account

    return { tradesHistory, username }
  }

  // Отправленные предложения
  async sended() {
    const { user, socket } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const sendedTrades = await Trade.findAll({
      where: {
        status: 0,
        fromId: user.id,
      },
      attributes: ['id', 'status', 'createdAt', 'updatedAt'],
      include: [
        {
          model: Account,
          as: 'from',
          attributes: ['username', 'avatar'],
        },
        {
          model: Account,
          as: 'to',
          attributes: ['username', 'avatar'],
        },
        {
          model: TradeItem,
          attributes: ['id'],
          include: [
            {
              model: Account,
              attributes: ['username'],
            },
            {
              model: AccountThing,
              attributes: ['id'],
              include: [
                {
                  model: Thing,
                  attributes: ['name', 'picture', 'thingclassId'],
                },
              ],
            },
          ],
        },
      ],
      order: [['createdAt', 'desc']],
    })

    return sendedTrades
  }

  // Отзыв предложения
  async cancel(tradeId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!tradeId) {
      throw new Error('Нет необходимых данных')
    }

    const trade = await Trade.findByPk(tradeId)

    if (!trade) {
      throw new Error('Предложение обмена не найдено')
    }

    if (trade.fromId != user.id) {
      throw new Error('Нельзя отзывать чужой обмен')
    }

    if (trade.status != 0) {
      throw new Error('Нельзя отменить неактивный обмен')
    }

    trade.status = 1
    await trade.save()
  }
}

module.exports = TradesService
