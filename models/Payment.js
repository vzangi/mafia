const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')

const Payment = sequelize.define('payments', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  pid: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
  },
  description: {
    type: DataTypes.STRING,
  },
  amount: {
    type: DataTypes.INTEGER,
  },
})

module.exports = Payment
