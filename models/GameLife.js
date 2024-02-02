const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const GamePlayer = require('./GamePlayer')

const types = {
  DAY: 1,
  NIGHT: 2,
  MANIAC: 3,
}

const GameLife = sequelize.define(
  'gamelifes',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    gameplayerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    life: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
    },
  },
  {
    timestamps: false,
  }
)

GameLife.types = types

GameLife.belongsTo(GamePlayer)
//GamePlayer.hasMany(GameLife)

module.exports = GameLife
