const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')

const TradeItem = sequelize.define(
  'naborthings',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    naborId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    thingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  }
)

module.exports = TradeItem
