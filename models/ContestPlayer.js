const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const Contest = require('./Contest')

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
})

ContestPlayer.belongsTo(Account)
ContestPlayer.belongsTo(Contest)

ContestPlayer.concount = async () => {
	const cons = await ContestPlayer.findAll({
		group: 'accountId',
		attributes: ['accountId'],
	})
	return cons.length
}

module.exports = ContestPlayer
