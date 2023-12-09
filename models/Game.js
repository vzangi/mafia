const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const GameType = require('./GameType')
const GamePlayer = require('./GamePlayer')
const Account = require('./Account')

const statuses = {
  WHAITNG: 0,
  NOT_STARTED: 1,
  STARTED: 2,
  ENDED: 3,
  STOPPED: 4,
}

const sides = {
  DRAW: 1,
  CITIZENS: 2,
  MAFIA: 3,
  MANIAC: 4,
}

const roles = {
  CITIZEN: 1,
  MAFIA: 2,
  KOMISSAR: 3,
  SERGEANT: 4,
  DOCTOR: 5,
  MANIAC: 6,
  CHILD: 7,
  ADVOCATE: 8,
  PROSTITUTE: 9,
}

const periods = {
  START: 1,
  DAY: 2,
  KOM: 3,
  NIGHT: 4,
  TRANSITION: 5,
  END: 6,
}

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
    period: {
      type: DataTypes.INTEGER,
    },
    competition: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    mode: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    rolesideId: {
      type: DataTypes.INTEGER,
    },
    day: {
      type: DataTypes.INTEGER,
    },
    startedAt: {
      type: DataTypes.DATE,
    },

    seconds: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        const s = Math.ceil(
          (new Date(this.deadline).getTime() - new Date().getTime()) / 1000
        )
        return s > 0 ? s : 0
      },
      set() {
        throw new Error('Do not try to set this value!')
      },
    },
  },
  {
    scopes: {
      def: {
        include: [
          { model: GameType },
          {
            model: Account,
            attributes: ['username', 'avatar', 'vip', 'vipTo'],
          },
          {
            model: GamePlayer,
            where: {
              status: 0,
            },
            attributes: ['status'],
            include: [
              {
                model: Account,
                attributes: ['username', 'avatar', 'online'],
              },
            ],
          },
        ],
        attributes: [
          'id',
          'deadline',
          'playersCount',
          'status',
          'waitingTime',
          'description',
          'createdAt',
          'seconds',
          'period',
          'day',
        ],
      },
      active: {
        where: {
          status: statuses.STARTED,
        },
        include: [
          { model: GameType },
          {
            model: Account,
            attributes: ['username', 'avatar', 'vip', 'vipTo'],
          },
        ],
        attributes: [
          'id',
          'deadline',
          'playersCount',
          'status',
          'waitingTime',
          'description',
          'createdAt',
          'seconds',
          'period',
          'day',
        ],
      },
    },
  }
)

Game.statuses = statuses
Game.sides = sides
Game.roles = roles
Game.periods = periods

Game.belongsTo(GameType)
Game.belongsTo(Account)
Game.hasMany(GamePlayer)

GamePlayer.belongsTo(Game)
GamePlayer.belongsTo(Account)

module.exports = Game
