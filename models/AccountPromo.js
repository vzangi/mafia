const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')

const AccountPromo = sequelize.define('accountpromos', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
  },
  promoId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
})

module.exports = AccountPromo
