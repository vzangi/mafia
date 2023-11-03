const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const Thing = require('./Thing')

const AccountThing = sequelize.define('accountthings', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  thingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  marketPrice: {
    type: DataTypes.INTEGER,
  },
})

AccountThing.belongsTo(Account)
AccountThing.belongsTo(Thing)

module.exports = AccountThing
