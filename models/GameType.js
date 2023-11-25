const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')

const GameType = sequelize.define(
  'gametypes',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  }
)

module.exports = GameType
