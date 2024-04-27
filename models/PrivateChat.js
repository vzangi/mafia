const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

const activeStatuses = {
	NOT_ACTIVE: 0,
	ACTIVE: 1,
	REMOVED: 2,
}

const PrivateChat = sequelize.define('privatechats', {
	id: {
		type: DataTypes.INTEGER,
		autoIncrement: true,
		primaryKey: true,
	},
	accountId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	friendId: {
		type: DataTypes.INTEGER,
		allowNull: false,
	},
	active: {
		type: DataTypes.INTEGER,
		defaultValue: 1,
	},
})

PrivateChat.activeStatuses = activeStatuses

PrivateChat.belongsTo(Account, { as: 'account', foreignKey: 'accountId' })
PrivateChat.belongsTo(Account, { as: 'friend', foreignKey: 'friendId' })

// Изменение активности приватного чата
PrivateChat.changeActive = async (
	accountId,
	friendId,
	active = activeStatuses.ACTIVE,
	newActive = activeStatuses.NOT_ACTIVE
) => {
	const pc = await PrivateChat.findOne({
		where: {
			active,
			[Op.or]: [
				{
					accountId: accountId,
					friendId: friendId,
				},
				{
					accountId: friendId,
					friendId: accountId,
				},
			],
		},
	})

	if (pc) {
		pc.active = newActive
		await pc.save()
	}
}

// Находит или создает приватный чат между игроками и возвращает его id
PrivateChat.findOrCreatePrivateChatId = async (accountId, friendId) => {
	const pc = await PrivateChat.findOne({
		where: {
			[Op.or]: [
				{
					accountId: accountId,
					friendId: friendId,
				},
				{
					accountId: friendId,
					friendId: accountId,
				},
			],
		},
	})

	if (pc) return pc.id

	const newPC = await PrivateChat.create({
		accountId,
		friendId,
	})

	return newPC.id
}

module.exports = PrivateChat
