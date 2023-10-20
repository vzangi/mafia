const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const { getCoolDateTime } = require('../units/helpers')

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
  coolChangeDate: {
    type: DataTypes.VIRTUAL(DataTypes.STRING),
    get() {
      return getCoolDateTime(this.createdAt)
    },
    set() {
      throw new Error('Do not try to set this value!')
    },
  },
})

AccountName.belongsTo(Account)

module.exports = AccountName
