const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const { getCoolDateTime } = require('../units/helpers')

const types = {
  MUTE: 1, // Мут
  NO_CREATION: 2, // Запрет создания партий
  NO_PLAYING: 3, // Запрет на игры
  NO_LOGIN: 4, // Запрет на вход
  NO_CLAIM: 5, // Запрет на жалобы
  NO_AVATAR: 6, // Запрет на установку аватара
}

const Punishment = sequelize.define('punishments', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.INTEGER,
  },
  untilAt: {
    type: DataTypes.DATE,
  },
  comment: {
    type: DataTypes.STRING,
  },
  coolDate: {
    type: DataTypes.VIRTUAL(DataTypes.STRING),
    get() {
      return getCoolDateTime(this.untilAt)
    },
  },
  current: {
    type: DataTypes.VIRTUAL(DataTypes.BOOLEAN),
    get() {
      const now = new Date(Date.now())
      const u = new Date(this.untilAt)
      return now < u
    },
  },
})

Punishment.types = types

Punishment.belongsTo(Account)
Account.hasMany(Punishment)

module.exports = Punishment
