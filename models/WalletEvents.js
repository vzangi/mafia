const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Thing = require('./Thing')
const Account = require('./Account')
const { getCoolDateTime } = require('../units/helpers')

const events = {
  PAYMENT: 0, // Пополнение
  MARRIAGE: 1, // Свадьба
  RECALL: 2, // Отзыв предложения
  DIVORCE: 3, // Развод
  DENIAL: 4, // Отказ от свадьбы
  SELLING: 5, // Продажа
  BUY: 6, // Покупка
  GIFT: 7, // Подарок
  NEWNIK: 8, // Смена ника
  TRANSFER: 9, // Перевод
  TRANSFER_IN: 10, // Получение перевода
}

const transferRate = 1.1
const sellingRate = 0.9

const WalletEvent = sequelize.define('walletevents', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  eventType: {
    type: DataTypes.INTEGER,
  },
  value: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  thingId: {
    type: DataTypes.INTEGER,
  },
  comment: {
    type: DataTypes.STRING,
  },
  coolDate: {
    type: DataTypes.VIRTUAL(DataTypes.STRING),
    get() {
      return getCoolDateTime(this.createdAt)
    },
  },
})

WalletEvent.events = events

WalletEvent.eventsOnPage = 10

WalletEvent.marriageCost = 50
WalletEvent.divorceCost = WalletEvent.marriageCost * 2
WalletEvent.recallCost = WalletEvent.marriageCost / 2

WalletEvent.transferRate = transferRate
WalletEvent.sellingRate = sellingRate

WalletEvent.belongsTo(Thing)
WalletEvent.belongsTo(Account)

// Транзакция
const transaction = async (
  eventType,
  accountId,
  value,
  thingId = null,
  comment = ''
) => {
  const t = await sequelize.transaction()
  try {
    value = value.toFixed(2)
    await WalletEvent.create(
      {
        accountId,
        eventType,
        value,
        thingId,
        comment,
      },
      { transaction: t }
    )

    await Account.increment('wallet', {
      by: value,
      where: { id: accountId },
      transaction: t,
    })

    await t.commit()
  } catch (error) {
    await t.rollback()
    throw new Error(error)
  }
}

// Пополнение кошелька
WalletEvent.payment = async (userId, sum) => {
  await transaction(WalletEvent.events.PAYMENT, userId, sum)
}

// Предложение пойти в ЗАГС
WalletEvent.marriage = async (userId) => {
  await transaction(
    WalletEvent.events.MARRIAGE,
    userId,
    -WalletEvent.marriageCost
  )
}

// Отзыв предложения
WalletEvent.recall = async (userId) => {
  await transaction(WalletEvent.events.RECALL, userId, WalletEvent.recallCost)
}

// Отказ от свадьбы
WalletEvent.denial = async (userId) => {
  await transaction(WalletEvent.events.DENIAL, userId, WalletEvent.recallCost)
}

// Покупка открытки
WalletEvent.gift = async (userId, giftCost) => {
  await transaction(WalletEvent.events.GIFT, userId, -giftCost)
}

// Смена ника
WalletEvent.nikChange = async (userId, nikChangeCost) => {
  await transaction(WalletEvent.events.NEWNIK, userId, -nikChangeCost)
}

// Развод
WalletEvent.divorce = async (userId) => {
  await transaction(
    WalletEvent.events.DIVORCE,
    userId,
    -WalletEvent.divorceCost
  )
}

// Перевод
WalletEvent.transfer = async (
  userId,
  recipientId,
  transferCount,
  comment = ''
) => {
  // Списываю средства у отправителя
  await transaction(
    WalletEvent.events.TRANSFER,
    userId,
    -transferCount * transferRate
  )
  // Зачисляю их получателю
  await transaction(
    WalletEvent.events.TRANSFER_IN,
    recipientId,
    transferCount,
    null,
    comment
  )
}

// Покупка вещи на маркете
WalletEvent.buyThing = async (userId, offer) => {
  const { marketPrice, accountId, thingId } = offer
  // Списываю средства со счёта покупателя
  await transaction(WalletEvent.events.BUY, userId, -marketPrice, thingId)

  // Зачисляю на счёт продавца (с учётом комиссии)
  await transaction(
    WalletEvent.events.SELLING,
    accountId,
    marketPrice * sellingRate,
    thingId
  )
}

// Продажа вещи
WalletEvent.sell = async (offer) => {
  const { accountId, thingId } = offer
  const { price } = offer.thing
  await transaction(WalletEvent.events.SELLING, accountId, price, thingId)
}

// Покупка вещи напрямую
WalletEvent.buyItem = async (userId, price, itemId) => {
  // Списываю средства со счёта покупателя
  await transaction(WalletEvent.events.BUY, userId, -price, itemId)
}

module.exports = WalletEvent
