const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const GameType = require('./GameType')

const Contest = sequelize.define(
	'contests',
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		name: {
			type: DataTypes.STRING,
		},
		gametypeId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		playersCount: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		mode: {
			type: DataTypes.INTEGER,
			defaultValue: 1,
		},
		active: {
			type: DataTypes.BOOLEAN,
			defaultValue: true,
		},
	},
	{
		scopes: {
			active: {
				where: {
					active: true,
				},
				order: [['gametypeId'], ['playersCount']],
			},
		},
	}
)

Contest.belongsTo(GameType)

module.exports = Contest
