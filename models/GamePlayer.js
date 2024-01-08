const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Role = require('./Role')
const Account = require('./Account')

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

const GamePlayer = sequelize.define(
  'gameplayers',
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
  },
  {
    scopes: {
      ingame(gameId) {
        return {
          where: {
            gameId,
            status: [
              playerStatuses.WHAITNG,
              playerStatuses.IN_GAME,
              playerStatuses.KILLED,
              playerStatuses.PRISONED,
              playerStatuses.TIMEOUT,
              playerStatuses.FREEZED,
              playerStatuses.WON,
            ],
          },
          attributes: ['id', 'status', 'username', 'accountId', 'roleId'],
          include: [
            {
              model: Account,
              attributes: ['online', 'avatar', 'gender'],
            },
            {
              model: Role,
            },
          ],
        }
      },
    },
  }
)

GamePlayer.playerStatuses = playerStatuses

GamePlayer.belongsTo(Role)

module.exports = GamePlayer
