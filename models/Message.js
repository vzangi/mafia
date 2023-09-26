const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

const Message = sequelize.define('messages', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  friendId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: 0,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
})

Message.belongsTo(Account, { as: 'account', foreignKey: 'accountId' })
Message.belongsTo(Account, { as: 'friend', foreignKey: 'friendId' })

module.exports = Message
