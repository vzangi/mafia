const fs = require('fs')
const Chat = require('../../models/Chat')
const Account = require('../../models/Account')
const Punishment = require('../../models/Punishment')
const BaseService = require('./BaseService')
const { Op } = require('sequelize')
const { getCoolDateTime } = require('../../units/helpers')
const Claim = require('../../models/Claim')
const log = require('../../units/customLog')

class PunishmentService extends BaseService {
	// Удаление запрета
	async removePunish(id) {
		if (!id) {
			throw new Error('Нет необходимых данных')
		}

		const punish = await Punishment.findOne({
			where: { id },
			include: [
				{
					model: Account,
				},
			],
		})

		if (!punish) {
			throw new Error('Запрет не найден')
		}

		if (punish.current) {
			// Генерирую сообщение
			const [message, notify] = this._removeMessage(punish)

			// Записываю сообщение в базу
			const sysmsg = await Chat.sysMessage(message)

			// Рассылаю сообщение всем подключенным пользователям
			this.io.of('/lobbi').emit('chat.message', sysmsg)

			// Уведомляю игрока о снятии запрета
			await this.notify(punish.account.id, notify, 3)
		}

		await punish.destroy()
	}

	// Создание запрета в ручном режиме
	async makePunish(punishData) {
		const { type, comment, username, period } = punishData

		// Беру аккаунт пользователя
		const account = await Account.findOne({
			where: { username },
		})

		if (!account) {
			throw new Error('Аккаунт не найден')
		}

		if (account.id == 1) {
			throw new Error('Себя забань)')
		}

		// Смотрю, есть ли у этого пользователя текущий запрет
		const hasPunish = await Punishment.findOne({
			where: {
				accountId: account.id,
				type,
				untilAt: {
					[Op.gte]: new Date(Date.now()).toISOString(),
				},
			},
		})

		if (hasPunish) {
			throw new Error(
				'У этого игрока ещё не завершился предыдущий запрет этого типа'
			)
		}

		const untilAt = new Date(
			Date.now() +
				1000 * 60 * period.minutes +
				1000 * 60 * 60 * period.hours +
				1000 * 60 * 60 * 24 * period.days
		).toISOString()

		const data = {
			type,
			accountId: account.id,
			untilAt,
			comment,
		}

		// Создаю запрет
		const punish = await Punishment.create(data)

		const [message, notify] = this._makeMessage(punish, account)

		// Записываю сообщение в базу
		const sysmsg = await Chat.sysMessage(message)

		// Рассылаю сообщение всем подключенным пользователям
		this.io.of('/lobbi').emit('chat.message', sysmsg)

		if (type != Punishment.types.NO_LOGIN) {
			// Перегружаю открытые сокеты наказанного игрока
			const socks = this.getUserSockets(account.id, '/lobbi')
			socks.forEach((s) => s.emit('reload'))
		} else {
			const socks = this.getUserSockets(account.id, '/')
			socks.forEach((s) => s.emit('logout'))
		}

		// Уведомляю игрока о запрете
		await this.notify(account.id, notify, 2)

		// Если запрет на смену авы, то удаляю её
		if (type == Punishment.types.NO_AVATAR) {
			// Удаляю предыдущее фото, чтобы не захламлять сервер
			fs.unlink(
				`${__dirname}/../../public/uploads/${account.avatar}`,
				(err) => {
					if (err) log(err)
				}
			)

			account.avatar = 'noname.svg'
			await account.save()
		}
	}

	// Сообщение при снятии запрета
	_removeMessage(punish) {
		if (punish.type == Punishment.types.MUTE) {
			return [
				`Администратор отменил молчанку игрока [${punish.account.username}]`,
				`Администратор отменил вашу молчанку`,
			]
		}
		if (punish.type == Punishment.types.NO_CREATION) {
			return [
				`Администратор отменил для [${punish.account.username}] запрет на создание заявок`,
				`Администратор отменил ваш запрет на создание заявок`,
			]
		}
		if (punish.type == Punishment.types.NO_PLAYING) {
			return [
				`Администратор отменил для [${punish.account.username}] запрет на участие в играх`,
				`Администратор отменил ваш запрет на участие в играх`,
			]
		}
		if (punish.type == Punishment.types.NO_LOGIN) {
			return [
				`Администратор отменил для [${punish.account.username}] запрет на вход в игру`,
				`Администратор отменил ваш запрет на вход в игру`,
			]
		}
		if (punish.type == Punishment.types.NO_CLAIM) {
			return [
				`Администратор отменил запрет на подачу жалоб игроком [${punish.account.username}]`,
				`Администратор отменил ваш запрет на подачу жалоб`,
			]
		}
		if (punish.type == Punishment.types.NO_AVATAR) {
			return [
				`Администратор отменил запрет на смену аватраки для [${punish.account.username}]`,
				`Администратор отменил ваш запрет на смену аватраки`,
			]
		}
	}

	// Сообщение при создании запрета
	_makeMessage(punish, account) {
		const date = getCoolDateTime(punish.untilAt)

		if (punish.type == Punishment.types.MUTE) {
			return [
				`[${account.username}] запрещается писать в этот чат до ${date}`,
				`Вам запрещено писать в чате лобби до ${date}`,
			]
		}
		if (punish.type == Punishment.types.NO_CREATION) {
			return [
				`[${account.username}] запрещается создавать партии до ${date}`,
				`Вам запрещено создавать партии до ${date}`,
			]
		}
		if (punish.type == Punishment.types.NO_PLAYING) {
			return [
				`[${account.username}] запрещается участвовать в партиях до ${date}`,
				`Вам запрещено участвовать в играх до ${date}`,
			]
		}
		if (punish.type == Punishment.types.NO_LOGIN) {
			return [
				`[${account.username}] запрещается вход на сайт до ${date}`,
				`Вам запрещено входить на сайт до ${date}`,
			]
		}
		if (punish.type == Punishment.types.NO_CLAIM) {
			return [
				`[${account.username}] запрещается подавать жалобы до ${date}`,
				`Вам запрещено подавать жалобы до ${date}`,
			]
		}
		if (punish.type == Punishment.types.NO_AVATAR) {
			return [
				`[${account.username}] запрещается менять аватарку до ${date}`,
				`Вам запрещено менять аватарку до ${date}`,
			]
		}
	}
}

module.exports = PunishmentService
