const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const { getCoolDateTime } = require('../units/helpers')

const Notification = sequelize.define('notifications', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  level: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
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

Notification.belongsTo(Account)

module.exports = Notification
