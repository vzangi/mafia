const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const GameType = require('./GameType')
const GamePlayer = require('./GamePlayer')
const Account = require('./Account')

const Game = sequelize.define(
  'games',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    gametypeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    playersCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    waitingTime: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    deadline: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    scopes: {
      def: {
        include: [
          { model: GameType },
          {
            model: GamePlayer,
            where: {
              status: 0,
            },
            include: [
              {
                model: Account,
                attributes: ['username', 'avatar']
              }
            ]
          },
        ],
      },
    },
  }
)

Game.belongsTo(GameType)
Game.belongsTo(Account)
Game.hasMany(GamePlayer)

GamePlayer.belongsTo(Game)
GamePlayer.belongsTo(Account)

module.exports = Game
