const { DataTypes, Sequelize } = require('sequelize')
const sequelize = require('../units/db')

const types = {
  TEXT: 1,
  STEP: 2,
  MAF: 3,
  KOM: 4,
  DOC: 5,
  ADV: 6,
}

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

GameLog.types = types

module.exports = GameLog
