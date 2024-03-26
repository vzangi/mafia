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

GameInitRole.rolesCount = async (gameId) => {
  const rolesInGame = await GameInitRole.findAll({ where: { gameId } })
  if (!rolesInGame) return 0
  return rolesInGame.reduce((a, b) => a + b['cnt'], 0)
}

module.exports = GameInitRole
