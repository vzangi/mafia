const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const Punishment = require('./Punishment')
const Game = require('./Game')

const types = {
	FILTHY: 1, // Мат
	FLOOD: 2, // Флуд
	ABUSE: 3, // Оскорбление
	FILTHY_IN_GAME: 4,
	FLOOD_IN_GAME: 5,
	ABUSE_IN_GAME: 6,
	MULT: 7, // Помощь другим аккаунтом
	SPOILING: 8, // Слив игры
}

const Claim = sequelize.define('claims', {
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	accountId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	playerId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	type: {
		type: DataTypes.INTEGER,
	},
	gameId: {
		type: DataTypes.DATE,
	},
	punishmentId: {
		type: DataTypes.INTEGER,
	},
	comment: {
		type: DataTypes.STRING,
	},
})

Claim.types = types

Claim.belongsTo(Account, { as: 'account', foreignKey: 'accountId' })
Claim.belongsTo(Account, { as: 'player', foreignKey: 'playerId' })

Claim.belongsTo(Game)
Claim.belongsTo(Punishment)

module.exports = Claim
