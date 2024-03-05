const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const Contest = require('./Contest')
const whaitingTime = 20

const ContestPlayer = sequelize.define('contestplayers', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  contestId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  time: {
    type: DataTypes.VIRTUAL,
    get() {
      return Math.ceil(
        whaitingTime * 60 +
          (new Date(this.createdAt).getTime() -
            new Date(Date.now()).getTime()) /
            1000
      )
    },
  },
})

ContestPlayer.belongsTo(Account)
ContestPlayer.belongsTo(Contest)

ContestPlayer.whaitingTime = whaitingTime

ContestPlayer.concount = async () => {
  const cons = await ContestPlayer.findAll({
    group: 'accountId',
    attributes: ['accountId'],
  })
  return cons.length
}

module.exports = ContestPlayer
