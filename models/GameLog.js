const { DataTypes, Sequelize } = require('sequelize')
const sequelize = require('../units/db')

const GameLog = sequelize.define('gamelogs', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  gameId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  hidden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  type: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
})

module.exports = GameLog
