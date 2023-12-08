const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

const GameChatUsers = sequelize.define(
  'chatuser',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    gamechatId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  { timestamps: false }
)

GameChatUsers.belongsTo(Account)

module.exports = GameChatUsers
