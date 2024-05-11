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

const Claim = sequelize.define(
	'claims',
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
		playerId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		type: {
			type: DataTypes.INTEGER,
		},
		gameId: {
			type: DataTypes.INTEGER,
		},
		punishmentId: {
			type: DataTypes.INTEGER,
		},
		comment: {
			type: DataTypes.STRING,
		},
		typeName: {
			type: DataTypes.VIRTUAL,
			get() {
				return Claim.reason(this.type)
			},
			set() {
				throw new Error('Do not try to set the `vip` value!')
			},
		},
	},
	{
		scopes: {
			def: {
				include: [
					{
						model: Account,
						as: 'account',
					},
					{
						model: Account,
						as: 'player',
					},
					{
						model: Game,
					},
					{
						model: Punishment,
					},
				],
			},
		},
	}
)

Claim.types = types

Claim.belongsTo(Account, { as: 'account', foreignKey: 'accountId' })
Claim.belongsTo(Account, { as: 'player', foreignKey: 'playerId' })

Claim.belongsTo(Game)
Claim.belongsTo(Punishment)
Punishment.hasMany(Claim)

Claim.reason = (type) => {
	switch (type * 1) {
		case 1:
			return 'мат'
		case 2:
			return 'флуд'
		case 3:
			return 'оскорбление'
		case 4:
			return 'мат в игре'
		case 5:
			return 'флуд в игре'
		case 6:
			return 'оскорбление в игре'
		case 7:
			return 'помощь вторым аккаунтом'
		case 8:
			return 'намеренная порча игры '
	}
	return 'хз'
}

Claim.limit = (type) => {
	switch (type * 1) {
		case 1:
			return 3
		case 2:
			return 3
		case 3:
			return 3
	}
	return 3
}

module.exports = Claim
