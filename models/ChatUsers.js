const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account') 

const ChatUsers = sequelize.define(
    'chatuser',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        accountId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        chatId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        }
    },
    { timestamps: false }
)

ChatUsers.belongsTo(Account)

module.exports = ChatUsers