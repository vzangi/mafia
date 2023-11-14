const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const TradeItem = require('./TradeItem')
const AccountThing = require('./AccountThing')
const { getCoolDateTime } = require('../units/helpers')

const Trade = sequelize.define('trades', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  fromId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  toId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  coolDate: {
    type: DataTypes.VIRTUAL(DataTypes.STRING),
    get() {
      return getCoolDateTime(this.createdAt)
    },
    set() {
      throw new Error('Do not try to set this value!')
    },
  },
})

Trade.belongsTo(Account, { as: 'from', foreignKey: 'fromId' })
Trade.belongsTo(Account, { as: 'to', foreignKey: 'toId' })

TradeItem.belongsTo(Account)
TradeItem.belongsTo(Trade)
TradeItem.belongsTo(AccountThing)

Trade.hasMany(TradeItem)

// В обмене может быть много вещей
//Trade.belongsToMany(AccountThing, { through: TradeItem })

// Вещь может быть в разных трейдах
//AccountThing.belongsToMany(Trade, { through: TradeItem })

module.exports = Trade
