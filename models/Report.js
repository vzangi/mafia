const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

const Report = sequelize.define('reports', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
  },
  message: {
    type: DataTypes.TEXT,
  },
  theme: {
    type: DataTypes.INTEGER,
  },
  screen: {
    type: DataTypes.STRING,
  },
})

Report.belongsTo(Account)

module.exports = Report
