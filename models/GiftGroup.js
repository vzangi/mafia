const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')

const GiftGroup = sequelize.define('giftgroups', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sort: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  active: {
    type: DataTypes.BOOLEAN,
    defaultValue: 1,
  },
})

module.exports = GiftGroup
