const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Role = require('./Role')
const Account = require('./Account')

const GameRole = sequelize.define(
  'gameroles',
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
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    playerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    timestamps: false,
  }
)

GameRole.belongsTo(Role)
GameRole.belongsTo(Account, { as: 'account', foreignKey: 'accountId' })
GameRole.belongsTo(Account, { as: 'player', foreignKey: 'playerId' })

module.exports = GameRole
