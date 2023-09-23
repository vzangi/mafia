const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Thing = require('./Thing')
const Account = require('./Account')
const { getCoolDateTime } = require('../units/helpers')

const events = {
  PAYMENT: 0, // Пополнение
  MARRIAGE: 1, // Свадьба
  DIVORCE: 2, // Развод
  SELLING: 3, // Продажа
  BUY: 4, // Покупка  
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

WalletEvent.belongsTo(Thing)
WalletEvent.belongsTo(Account)

module.exports = WalletEvent