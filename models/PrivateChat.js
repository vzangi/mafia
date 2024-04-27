const { DataTypes, Op, where } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const Message = require('./Message')

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

function getAccountData(account) {
	return {
		username: account.username,
		avatar: account.avatar,
		online: account.online,
		vip: account.vip,
		vipTo: account.vipTo,
		id: account.id,
	}
}

// Получение чатов
PrivateChat.getChats = async (accountId) => {
	const chats = await PrivateChat.findAll({
		where: {
			active: activeStatuses.ACTIVE,
			[Op.or]: [
				{
					accountId: accountId,
				},
				{
					friendId: accountId,
				},
			],
		},
		include: [
			{
				model: Account,
				as: 'account',
			},
			{
				model: Account,
				as: 'friend',
			},
		],
	})

	const result = []

	for (const index in chats) {
		const chat = chats[index]
		const lastMessage = await Message.findOne({
			where: {
				privatechatId: chat.id,
			},
			limit: 1,
			order: [['id', 'desc']],
			attributes: ['message', 'id', 'isRead', 'accountId'],
			raw: true,
		})
		const data = {
			id: chat.id,
			...lastMessage,
		}

		data.account =
			chat.account.id == accountId
				? getAccountData(chat.friend)
				: getAccountData(chat.account)

		result.push(data)
	}

	return result.sort((a, b) => b.id - a.id)
}

module.exports = PrivateChat
