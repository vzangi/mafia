const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Thing = require('./Thing')
const Account = require('./Account')
const { getCoolDateTime } = require('../units/helpers')

const events = {
  PAYMENT: 0,   // Пополнение
  MARRIAGE: 1,  // Свадьба
  RECALL: 2,    // Отзыв предложения
  DIVORCE: 3,   // Развод
  SELLING: 4,   // Продажа
  BUY: 5,       // Покупка  
}

const WalletEvent = sequelize.define(
  'walletevents',
  {
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
    coolDate: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return getCoolDateTime(this.createdAt)
      }
    }
  }
)

WalletEvent.events = events

WalletEvent.marriageCost = 50
WalletEvent.divorceCost = WalletEvent.marriageCost * 2
WalletEvent.recallCost = WalletEvent.marriageCost / 2

WalletEvent.belongsTo(Thing)
WalletEvent.belongsTo(Account)

const transaction = async (eventType, accountId, value) => {
  const t = await sequelize.transaction()
  try {

    await WalletEvent.create({
      accountId,
      eventType,
      value,
    }, { transaction: t })

    await Account.increment('wallet', {
      by: value,
      where: { id: accountId },
      transaction: t
    })

    await t.commit()

  } catch (error) {
    await t.rollback()
    throw new Error(error)
  }
}

// Транзакция пополнения кошелька
WalletEvent.payment = async (userId, sum) => {
  transaction(WalletEvent.events.PAYMENT, userId, sum)
}

// Транзакция предложения пойти в ЗАГС
WalletEvent.marriage = async (userId) => {
  transaction(WalletEvent.events.MARRIAGE, userId, -WalletEvent.marriageCost)
}

// Транзакция отзыва предложения
WalletEvent.recall = async (userId) => {
  transaction(WalletEvent.events.RECALL, userId, WalletEvent.recallCost)
}

// Транзакция развода
WalletEvent.divorce = async (userId) => {
  transaction(WalletEvent.events.DIVORCE, userId, -WalletEvent.divorceCost)
}

module.exports = WalletEvent