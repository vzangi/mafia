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

GameStep.maxVotes = async (game) => {
  let maxVotes = 0
  let prevVotes = 0

  const votes = await GameStep.findAll({
    where: {
      gameId: game.id,
      day: game.day,
    },
    group: 'playerId',
    attributes: [
      'playerId',
      [sequelize.fn('COUNT', sequelize.col('*')), 'votesCount'],
    ],
    order: [['votesCount', 'DESC']],
    limit: 2,
  })
  if (votes.length > 0) maxVotes = votes[0].dataValues.votesCount
  if (votes.length > 1) prevVotes = votes[1].dataValues.votesCount
  return { maxVotes, prevVotes }
}

module.exports = GameStep
