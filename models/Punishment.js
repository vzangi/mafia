const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

const types = {
	MUTE: 1, // Мут
	NO_CREATION: 2, // Запрет создания партий
	NO_PLAYING: 3, // Запрет на игры
	NO_LOGIN: 4, // Запрет на вход
	NO_CLAIM: 5, // Запрет на жалобы
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
})

Punishment.types = types

Punishment.belongsTo(Account)
Account.hasMany(Punishment)

module.exports = Punishment
