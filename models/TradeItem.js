const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')

const TradeItem = sequelize.define(
  'tradeitems',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    tradeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    accountthingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    accountId: {
      type: DataTypes.INTEGER,
    },
  }
)

module.exports = TradeItem
