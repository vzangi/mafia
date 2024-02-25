const { Op } = require('sequelize')
const Account = require('../models/Account')
const Punishment = require('../models/Punishment')

const isAuth = (req, res, next) => {
	const { user } = req
	if (user) return next()
	res.redirect('/login')
}

// добавляю авторизованного пользователя в переменную user шаблонизатора
const userToTemplate = async (req, res, next) => {
	const { user } = req

	if (!user) {
		return next()
	}

	const account = await Account.findOne({
		where: {
			id: user.id,
		},
		attributes: [
			'id',
			'username',
			'avatar',
			'vipTo',
			'online',
			'vip',
			'wallet',
			'status',
			'role',
			'gender',
			'rank',
			'level',
			'email',
			'telegramChatId',
		],
		include: [
			{
				model: Punishment,
				where: {
					untilAt: {
						[Op.gt]: new Date().toISOString(),
					},
				},
				required: false,
			},
		],
	})

	req.account = account
	res.locals.currentAccount = account

	next()
}

const userToSocket = async (socket, next) => {
	const { user } = socket
	if (!user) return next()

	const account = await Account.findOne({
		where: {
			id: user.id,
		},
		attributes: [
			'id',
			'username',
			'avatar',
			'vipTo',
			'online',
			'vip',
			'wallet',
			'status',
			'role',
			'gender',
			'rank',
			'level',
			'email',
		],
		include: [
			{
				model: Punishment,
				where: {
					untilAt: {
						[Op.gt]: new Date().toISOString(),
					},
				},
				required: false,
			},
		],
	})

	socket.account = account

	next()
}

module.exports = {
	isAuth,
	userToTemplate,
	userToSocket,
}
