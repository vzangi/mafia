const { Op } = require('sequelize')
const Friend = require('../../models/Friend')
const Account = require('../../models/Account')
const WalletEvent = require('../../models/WalletEvents')
const bot = require('../../units/bot')
const BaseService = require('./BaseService')
const Chat = require('../../models/Chat')
const PrivateChat = require('../../models/PrivateChat')
const { genders } = Account

class FriendsService extends BaseService {
	// Отправка оповещения о новом запросе на дружбу
	async _notifyFriendshipRequest(friendId) {
		const { socket } = this

		const count = await Friend.requestsCount(friendId)

		const ids = this.getUserSocketIds(friendId)
		ids.forEach((sid) => {
			socket.broadcast.to(sid).emit('friend.request', count)
		})
	}

	// Удаление запросов на добавление в друзья
	async _removeRequests(friendId) {
		const { user } = this
		await Friend.destroy({
			where: {
				accountId: user.id,
				friendId,
			},
		})
		await Friend.destroy({
			where: {
				accountId: friendId,
				friendId: user.id,
			},
		})
	}

	// Создаю запись
	async _addRequest(friendId, status) {
		const { user } = this
		await Friend.create({
			accountId: user.id,
			friendId,
			status,
		})

		await Friend.create({
			accountId: friendId,
			friendId: user.id,
			status,
		})
	}

	// Добавление в друзья
	async add(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		if (user.id == friendId) {
			throw new Error('Дружить с самим собой? Серьёзно!?')
		}

		// Создаем запрос на дружбу (или просто нахоим его, если он уже был создан)
		const [_, created] = await Friend.findOrCreate({
			where: {
				accountId: user.id,
				friendId,
			},
		})

		// Оповещение о новом запросе на дружбу
		this._notifyFriendshipRequest(friendId)

		const { socket } = this
		if (socket.account) {
			// Отправляю уведомление другу
			this.notify(friendId, `${socket.account.username} хочет с тобой дружить`)
		}
	}

	// Подтверждение добавления в друзья
	async accept(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		// Ищу запрос на добавление в друзья
		const request = await Friend.findOne({
			where: {
				accountId: friendId,
				friendId: user.id,
				status: Friend.statuses.REQUESTED,
			},
		})

		if (!request) {
			throw new Error('Запрос на дружбу не найден')
		}

		// Удаляю запросы на добавление в друзья
		await this._removeRequests(friendId)

		// Создаю записи подтверждение
		await this._addRequest(friendId, Friend.statuses.ACCEPTED)

		// Возобновляю приватный чат между игроками (если он был)
		await PrivateChat.changeActive(
			user.id,
			friendId,
			PrivateChat.activeStatuses.NOT_ACTIVE,
			PrivateChat.activeStatuses.ACTIVE
		)

		const { socket } = this
		if (socket.account) {
			// Отправляю уведомление другу
			this.notify(
				friendId,
				`${socket.account.username} ${
					socket.account.gender == genders.FEMALE
						? 'приняла'
						: socket.account.gender == genders.MALE
						? 'принял'
						: 'принял(а)'
				} ваш запрос, теперь вы друзья`
			)
		}
	}

	// Отклонение добавления в друзья
	async decline(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		// Ищу запрос на добавление в друзья
		const request = await Friend.findOne({
			where: {
				accountId: friendId,
				friendId: user.id,
				status: Friend.statuses.REQUESTED,
			},
		})

		if (!request) {
			throw new Error('Запрос на дружбу не найден')
		}

		// Удаляю запросы на добавление в друзья
		await this._removeRequests(friendId)

		// Создаю отмену
		await Friend.create({
			accountId: friendId,
			friendId: user.id,
			status: Friend.statuses.DECLINE,
		})

		const { socket } = this
		if (socket.account) {
			// Отправляю уведомление
			this.notify(
				friendId,
				`${socket.account.username} ${
					socket.account.gender == genders.FEMALE
						? 'отклонила'
						: socket.account.gender == genders.MALE
						? 'отклонил'
						: 'отклонил(а)'
				} ваш запрос на дружбу`,
				2
			)
		}
	}

	// Удаление из друзей
	async remove(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		// Ищу запись о дружбе
		const request = await Friend.findOne({
			where: {
				accountId: user.id,
				friendId,
				status: Friend.statuses.ACCEPTED,
			},
		})

		if (!request) {
			throw new Error('Записи о дружбе не найдены')
		}

		// Удаляю записи о дружбе игроков
		await this._removeRequests(friendId)

		// Скрываю приватный чат между игроками
		await PrivateChat.changeActive(user.id, friendId)

		const { socket } = this
		if (socket.account) {
			// Отправляю уведомление
			this.notify(
				friendId,
				`${socket.account.username} ${
					socket.account.gender == genders.FEMALE
						? 'удалила'
						: socket.account.gender == genders.MALE
						? 'удалил'
						: 'удалил(а)'
				} вас из друзей`,
				2
			)
		}
	}

	// Блокировка (ЧС)
	async block(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		// Надо проверить, есть ли сделанные предложения или игроки женаты
		// Тогда вернуть ошибку, так как это платные услуги
		const relation = await Friend.findOne({
			where: {
				accountId: user.id,
				friendId,
				[Op.or]: [
					{ status: Friend.statuses.MARRIED_REQUEST },
					{ status: Friend.statuses.MARRIED },
				],
			},
			order: [['id', 'DESC']],
		})

		if (relation) {
			throw new Error('Нельзя заблокировать игрока, которого позвали в ЗАГС')
		}

		// Удаляю записи дружбы, если они были
		await this._removeRequests(friendId)

		// Создаю запись ЧС
		await Friend.create({
			accountId: user.id,
			friendId,
			status: Friend.statuses.BLOCK,
		})
	}

	// Разблокировка от ЧС
	async unblock(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		// Удаляю запись блокировки
		await Friend.destroy({
			where: {
				accountId: user.id,
				friendId,
				status: Friend.statuses.BLOCK,
			},
		})
	}

	// Блокировка в ответ (ЧС)
	async blockToo(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		const block = await Friend.destroy({
			where: {
				accountId: friendId,
				friendId: user.id,
				status: Friend.statuses.BLOCK,
			},
		})

		if (!block) {
			throw new Error('Вы не заблокированы у этого игрока')
		}

		// Удаляю записи дружбы, если они были
		await this._removeRequests(friendId)

		// Создаю записи ЧС
		await this._addRequest(friendId, Friend.statuses.BLOCK)
	}

	// Позвать в ЗАГС
	async zags(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		const account = await Account.findByPk(user.id)

		if (!account) {
			throw new Error('Пользователь не найден. Запрос не выполнен.')
		}

		if (account.wallet < WalletEvent.marriageCost) {
			throw new Error(
				`В кошельке не хватает средств. Чтобы сделать предложение, там должно быть как минимум ${WalletEvent.marriageCost} рублей.`
			)
		}

		// Ищем игрока в друзьях (предложение можно сделать только другу)
		const isFrends = await Friend.findOne({
			where: {
				friendId,
				accountId: user.id,
				status: Friend.statuses.ACCEPTED,
			},
		})

		if (!isFrends) {
			throw new Error('Предложение можно сделать только одному из друзей')
		}

		const haveZagsRequests = await Friend.findOne({
			where: {
				accountId: user.id,
				[Op.or]: [
					{ status: Friend.statuses.MARRIED },
					{ status: Friend.statuses.MARRIED_REQUEST },
				],
			},
		})

		if (haveZagsRequests) {
			throw new Error(
				haveZagsRequests.status == Friend.statuses.MARRIED
					? 'Вы уже сходили в ЗАГС'
					: 'Вы уже сделали предложение, нельзя делать второе пока оно не отклонено'
			)
		}

		const friendMarried = await Friend.findOne({
			where: {
				friendId,
				[Op.or]: [
					{ status: Friend.statuses.MARRIED },
					{ status: Friend.statuses.MARRIED_REQUEST },
				],
			},
		})

		if (friendMarried) {
			throw new Error(
				friendMarried.status == Friend.statuses.MARRIED
					? 'Этот игрок уже сходил в ЗАГС'
					: 'Этому игроку уже сделали предложение'
			)
		}

		// Списываю с кошелька стомость свадьбы
		await WalletEvent.marriage(user.id)

		// Создаю запрос предложения
		await Friend.create({
			accountId: user.id,
			friendId,
			status: Friend.statuses.MARRIED_REQUEST,
		})

		// Пробуем оповестить о новом предложении
		this._notifyFriendshipRequest(friendId)

		const notifyText = `${account.username} зовёт вас в ЗАГС!`
		// Отправляю уведомление
		this.notify(friendId, notifyText, 1)

		// Если у друга подключен ТГ, то отправляю уведомление туда
		const friend = await Account.findByPk(friendId)
		if (friend && friend.telegramChatId && !friend.online) {
			bot.sendMessage(friend.telegramChatId, notifyText)
		}
	}

	// Согласие на ЗАГС
	async zagsAccept(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		// Ищу предложение
		const request = await Friend.findOne({
			where: {
				accountId: friendId,
				friendId: user.id,
				status: Friend.statuses.MARRIED_REQUEST,
			},
		})

		if (!request) {
			throw new Error('Предложение не найдено')
		}

		// Удаляю запросы на добавление в друзья
		await this._removeRequests(friendId)

		// Создаю подтверждение
		await this._addRequest(friendId, Friend.statuses.MARRIED)

		const { socket } = this
		if (socket.account) {
			// Отправляю уведомление
			this.notify(
				friendId,
				`${socket.account.username} ${
					socket.account.gender == genders.FEMALE
						? 'согласилась'
						: socket.account.gender == genders.MALE
						? 'согласился'
						: 'согласился(ась)'
				} на твоё предложение руки и сердца!`,
				1
			)
		}

		const partner = await Account.findByPk(friendId)
		if (!partner) return

		const msg = `<span class="text-white">[${socket.account.username}] и [${partner.username}] теперь женаты, поздравляем молодожёнов! ~Bottle</span>`

		// Записываю сообщение в базу
		const sysmsg = await Chat.sysMessage(msg, false)

		// Рассылаю сообщение всем подключенным пользователям
		this.io.of('/lobbi').emit('chat.message', sysmsg)
	}

	// Отказ от ЗАГСА
	async zagsDecline(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		// Удаляю запросы на загс
		await Friend.destroy({
			where: {
				accountId: user.id,
				friendId,
				status: Friend.statuses.MARRIED_REQUEST,
			},
		})
		await Friend.destroy({
			where: {
				accountId: friendId,
				friendId: user.id,
				status: Friend.statuses.MARRIED_REQUEST,
			},
		})

		// Возвращаю на кошелёк половину средств потраченных на предложение
		await WalletEvent.denial(friendId)

		const { socket } = this
		if (socket.account) {
			// Отправляю уведомление
			this.notify(
				friendId,
				`${socket.account.username} ${
					socket.account.gender == genders.FEMALE
						? 'отказалась'
						: socket.account.gender == genders.MALE
						? 'отказался'
						: 'отказался(ась)'
				} от твоего предложения руки и сердца`,
				2
			)
		}
	}

	// Отозвать предложение
	async recall(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		// Находим предложение
		const request = await Friend.findOne({
			where: {
				accountId: user.id,
				friendId,
				status: Friend.statuses.MARRIED_REQUEST,
			},
		})

		if (!request) {
			throw new Error('Предложение не найдено')
		}

		// Возвращаю на кошелёк половину средств потраченных на предложение
		await WalletEvent.recall(user.id)

		// Удаляю предложение
		await request.destroy()

		const { socket } = this
		if (socket.account) {
			// Отправляю уведомление
			this.notify(
				friendId,
				`${socket.account.username} ${
					socket.account.gender == genders.FEMALE
						? 'отозвала'
						: socket.account.gender == genders.MALE
						? 'отозвал'
						: 'отозвал(а)'
				} своё предложение руки и сердца`,
				2
			)
		}
	}

	// Развод
	async divorce(friendId) {
		const { user } = this
		if (!user) {
			throw new Error('Не авторизован')
		}

		if (!friendId) {
			throw new Error('Нет необходимых данных')
		}

		const isMarried = await Friend.findOne({
			where: {
				accountId: user.id,
				friendId,
				status: Friend.statuses.MARRIED,
			},
		})

		if (!isMarried) {
			throw new Error(
				'Вы не можете развестись с тем, с кем не состоите в отношениях'
			)
		}

		const account = await Account.findByPk(user.id)
		if (!account) {
			throw new Error('Пользователь не найден. Запрос не выполнен.')
		}

		if (account.wallet < WalletEvent.divorceCost) {
			throw new Error(
				`В кошельке не хватает средств. Чтобы развестись, там должно быть как минимум ${WalletEvent.divorceCost} рублей.`
			)
		}

		// Списываю с кошелька стомость развода
		await WalletEvent.divorce(user.id)

		// Удаляю записи о свадьбе
		await this._removeRequests(friendId)

		// Возвращаю дружбу
		await this._addRequest(friendId, Friend.statuses.ACCEPTED)

		const { socket } = this
		if (socket.account) {
			// Отправляю уведомление
			this.notify(
				friendId,
				`${socket.account.username} ${
					socket.account.gender == genders.FEMALE
						? 'развелась'
						: socket.account.gender == genders.MALE
						? 'развёлся'
						: 'развелся(ась)'
				} с тобой`,
				2
			)
		}

		const partner = await Account.findByPk(friendId)
		if (!partner) return

		const msg = `[${socket.account.username}] и [${partner.username}] развелись ~CatCry`

		// Записываю сообщение в базу
		const sysmsg = await Chat.sysMessage(msg)

		// Рассылаю сообщение всем подключенным пользователям
		this.io.of('/lobbi').emit('chat.message', sysmsg)
	}
}

module.exports = FriendsService
