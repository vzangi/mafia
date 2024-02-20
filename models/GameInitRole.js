const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Role = require('./Role')

const GameInitRole = sequelize.define(
  'gameinitroles',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    gameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    cnt: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
  },
  {
    timestamps: false,
  }
)

GameInitRole.belongsTo(Role)

module.exports = GameInitRole
