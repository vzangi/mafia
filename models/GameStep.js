const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

/* 
  1 - дневной ход
  2 - выстрел ночью 
  3 - проверка роли 
  4 - лечение врача
  5 - защита адвоката
  6 - выстрел маньяка
  7 - заморозка от любовницы
*/
const stepTypes = {
  DAY: 1,
  NIGHT: 2,
  CHECK: 3,
  THERAPY: 4,
  PROTECTION: 5,
  KILLING: 6,
  FREEZING: 7,
}

const GameStep = sequelize.define('gamesteps', {
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
  day: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  stepType: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
})

GameStep.stepTypes = stepTypes

GameStep.belongsTo(Account, { as: 'account', foreignKey: 'accountId' })
GameStep.belongsTo(Account, { as: 'player', foreignKey: 'playerId' })

module.exports = GameStep
