const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')

const playerStatuses = {
  WHAITNG: 0,
  LEAVE: 1,
  DROPPED: 2,
  IN_GAME: 3,
  KILLED: 4,
  PRISONED: 5,
  TIMEOUT: 6,
  FREEZED: 7,
  WON: 8,
}

const GamePlayer = sequelize.define('gameplayers', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  gameId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  roleId: {
    type: DataTypes.INTEGER,
  },
})

GamePlayer.playerStatuses = playerStatuses

module.exports = GamePlayer
