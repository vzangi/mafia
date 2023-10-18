const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

const AccountName = sequelize.define('accountnames', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
  },
})

AccountName.belongsTo(Account)

module.exports = AccountName
