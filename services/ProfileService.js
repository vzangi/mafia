const fs = require('fs')
const Jimp = require('jimp')
const bcrypt = require('bcrypt')
const { Op } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('../models/Account')
const AccountGift = require('../models/AccountGift')
const AccountName = require('../models/AccountName')
const AccountThing = require('../models/AccountThing')
const Friend = require('../models/Friend')
const WalletEvents = require('../models/WalletEvents')
const Notification = require('../models/Notification')
const ThingType = require('../models/ThingType')
const Trade = require('../models/Trade')
const Thing = require('../models/Thing')
const Punishment = require('../models/Punishment')
const Claim = require('../models/Claim')
const GameEvent = require('../models/GameEvent')
const log = require('../units/customLog')
const GamePlayer = require('../models/GamePlayer')
const Role = require('../models/Role')
const Game = require('../models/Game')
const AccountSetting = require('../models/AccountSetting')
const { getCoolDateTime } = require('../units/helpers')

class ProfileService {
	async profileInfo(profile, currentUser) {
		const data = {}
		data.profile = profile
		data.title = `Профиль ${profile.username} — игрока онлайн проекта Мафия`
		data.description = `Персональная страница ${profile.username} — игрока онлайн проекта Mafia One. На этой странице вы можете посмотреть личную статистику, список друзей, подаренные игроку открытки и список вещей в инвентаре.`
		data.ogimage = process.env.APP_HOST + '/uploads/' + profile.avatar

		data.friends = await Friend.scope({
			method: ['friends', profile.id],
		}).findAll()

		data.partner = await Friend.scope({
			method: ['partner', profile.id],
		}).findOne()

		data.friendsCorrectForm = Friend.correctForm(data.friends.length)

		// Значок
		data.badge = await AccountThing.findOne({
			where: {
				accountId: profile.id,
				taked: true,
				marketPrice: null,
			},
			include: [
				{
					model: Thing,
					where: {
						thingtypeId: 6,
					},
				},
			],
		})

		data.hideinvent = await AccountSetting.getHideInventSetting(profile.id)

		if (currentUser) {
			data.isFrends = await Friend.findOne({
				where: {
					accountId: profile.id,
					friendId: currentUser.id,
				},
				order: [['id', 'DESC']],
			})
			data.isBlock = await Friend.findOne({
				where: {
					accountId: profile.id,
					friendId: currentUser.id,
					status: Friend.statuses.BLOCK,
				},
			})
			data.havePartner = await Friend.findOne({
				where: {
					accountId: currentUser.id,
					status: Friend.statuses.MARRIED,
				},
			})

			// Зашёл в свой профиль
			if (currentUser.id == profile.id) {
				data.myprofile = true
				// Пометить открытки просмотренными
				try {
					await AccountGift.update(
						{
							accountId: currentUser.id,
						},
						{
							where: {
								accountId: currentUser.id,
								createdAt: {
									[Op.eq]: sequelize.col('updatedAt'),
								},
							},
						}
					)
				} catch (error) {}
			}
		}

		data.gifts = await AccountGift.scope({
			method: ['withModels', profile.id],
		}).findAll()

		data.things = await AccountThing.scope({
			method: ['withThings', profile.id],
		}).findAll({
			limit: 9,
			order: [['id', 'desc']],
		})

		// Наказания
		data.punishments = await Punishment.findAll({
			where: {
				accountId: profile.id,
			},
			include: [
				{
					model: Claim,
					as: 'claims',
					include: [
						{
							model: Account,
							attributes: ['username'],
							as: 'account',
						},
					],
				},
			],
			order: [
				['id', 'desc'],
				[{ model: Claim }, 'id', 'asc'],
			],
		})

		data.power = await AccountThing.getPower(profile.id)

		data.levelNum = Account.getLevelByBorder(profile.level)
		data.levelName = Account.levelNames[data.levelNum]

		data.rankImg = 6
		if (profile.rank < 4000) data.rankImg = 5
		if (profile.rank < 3500) data.rankImg = 4
		if (profile.rank < 3000) data.rankImg = 3
		if (profile.rank < 2500) data.rankImg = 2
		if (profile.rank < 1500) data.rankImg = 1

		return data
	}

	async profileByNik(nik, user) {
		let profile = null
		if (nik) {
			profile = await Account.findOne({
				where: {
					username: nik,
					status: {
						[Op.ne]: 0,
					},
				},
			})
		} else {
			profile = await Account.findOne({ where: { id: user.id } })
		}

		if (!profile) {
			throw new Error(`Профиль по нику ${nik} не найден`)
		}

		const data = await this.profileInfo(profile, user)
		return data
	}

	async currentUserFriendsList(user) {
		const account = await Account.findByPk(user.id)
		const data = await this.friendsList(account.username)
		return data
	}

	async friendsList(nik) {
		const profile = await Account.findOne({
			where: {
				username: nik,
			},
		})

		const friends = await Friend.scope('def').findAll({
			where: {
				accountId: profile.id,
				status: Friend.statuses.ACCEPTED,
			},
		})

		const partner = await Friend.scope('def').findOne({
			where: {
				accountId: profile.id,
				status: Friend.statuses.MARRIED,
			},
		})

		const data = {
			profile,
			friends,
			partner,
			title: `Друзья игрока ${profile.username}`,
		}

		return data
	}

	async friendsRequest(account) {
		const requests = await Friend.scope({
			method: ['requests', account.id],
		}).findAll()

		const data = {
			requests,
			title: `Запросы в друзья`,
		}

		return data
	}

	async wallet(account) {
		const accountId = account.id
		const eventCount = await WalletEvents.count({ where: { accountId } })

		const data = {
			eventCount,
			title: `Кошелёк - пополнение баланса`,
		}

		return data
	}

	async settings(account) {
		const accountId = account.id
		const nikChanges = await AccountName.findAll({
			where: { accountId },
			order: [['id', 'DESC']],
		})

		const data = {
			nikChanges,
			title: `Настройки профиля ${account.username}`,
		}

		// Беру текущее значение настройки отображения инвентаря
		data.hideinvent = await AccountSetting.getHideInventSetting(accountId)

		return data
	}

	async changePassword(account, password, passwordConfirm) {
		if (!account) {
			throw new Error('Не авторизован')
		}

		if (!password || !passwordConfirm) {
			throw new Error('Нет необходимых данных')
		}

		if (password != passwordConfirm) {
			throw new Error('Пароли не совпадают')
		}

		try {
			const hash = await bcrypt.hash(password, 10)
			await Account.update({ password: hash }, { where: { id: account.id } })
			return true
		} catch (error) {
			throw new Error('Ошибка при смене пароля')
		}
	}

	async changeAvatar(account, avatar) {
		if (!account || !avatar) throw new Error('Нет необходимых данных')

		const hasAvatarPunish = await Punishment.findOne({
			where: {
				accountId: account.id,
				type: Punishment.types.NO_AVATAR,
				untilAt: {
					[Op.gte]: new Date().toISOString(),
				},
			},
		})

		if (hasAvatarPunish) {
			throw new Error(
				`У вас действет запрет на смену аватарки до ${getCoolDateTime(
					hasAvatarPunish.untilAt
				)}`
			)
		}

		let ext = ''
		if (avatar.mimetype == 'image/jpeg') ext = 'jpg'
		if (avatar.mimetype == 'image/png') ext = 'png'
		if (avatar.mimetype == 'image/gif') ext = 'gif'
		if (avatar.mimetype == 'image/webp') ext = 'webp'

		if (ext == '') {
			throw new Error(
				'Можно загружать только фото в формате: jpg, png, gif, webp'
			)
		}

		const rnd1 = Math.ceil(Math.random() * 10000)
		const rnd2 = Math.ceil(Math.random() * 10000)

		// Формирую имя новой автарки
		const fileName = `${account.id}-${rnd1}-${rnd2}.${ext}`

		// Запрещаю загрузку автарок больше 5 мегабайт
		if (avatar.size > 5_000_000) {
			throw new Error('Размер фото не должно превышать ограничение в 5Mb')
		}

		// Если размер аватарки больше 300 Кб, то сжимаю её
		if (avatar.size > 300_000) {
			const img = await Jimp.read(avatar.data)
			img.resize(250, Jimp.AUTO).writeAsync('./public/uploads/' + fileName)
		} else {
			// Перемещаю загруженное фото в папку с загрузками
			await avatar.mv('./public/uploads/' + fileName)
		}

		// Если предыдущее фото не то, что даётся по умолчанию
		if (account.avatar != 'noname.svg') {
			// Удаляю предыдущее фото, чтобы не захламлять сервер
			fs.unlink(`${__dirname}/../public/uploads/${account.avatar}`, (err) => {
				if (err) log(err)
			})
		}

		// Сохраняю автарку в базу
		account.avatar = fileName
		await account.save()

		return fileName
	}

	async notifications(account) {
		if (!account) {
			throw new Error('Нет необходимых данных')
		}
		const notifies = await Notification.findAll({
			where: {
				accountId: account.id,
			},
			limit: 10,
			order: [['id', 'DESC']],
		})

		const data = {
			notifies,
			botName: process.env.TELEGRAM_BOT_NAME || 'MafiaUanBot',
		}

		return data
	}

	async removeNotify(account, notifyId) {
		if (!account || !notifyId) {
			throw new Error('Нет необходимых данных')
		}

		await Notification.destroy({
			where: {
				id: notifyId,
				accountId: account.id,
			},
		})
	}

	// Отключение уведомлений в telegram
	async offTelegramNotifes(account) {
		if (!account) {
			throw new Error('Нет необходимых данных')
		}

		// Просто забываем id чата
		account.telegramChatId = null
		await account.save()
	}

	// Данные для страницы инвентаря
	async inventory(username, user) {
		const profile = await Account.findOne({ where: { username } })
		if (!profile) {
			throw new Error('Пользователь с таким ником не найден')
		}

		if (!user || user.id != profile.id) {
			const hideinvent = await AccountSetting.getHideInventSetting(profile.id)

			// Если инвентарь виден только друзьям
			if (hideinvent == 1) {
				if (!user) {
					throw new Error(`Доступ в инвентарь ${username} закрыт`)
				}

				const isFriends = await Friend.findOne({
					where: {
						accountId: profile.id,
						friendId: user.id,
					},
					order: [['id', 'DESC']],
				})

				if (!isFriends) {
					throw new Error(
						`Доступ в инвентарь ${username} закрыт для ${user.id}`
					)
				}
			}

			if (hideinvent == 2) {
				if (!user) {
					throw new Error(`Доступ в инвентарь ${username} закрыт`)
				}

				if (profile.id != user.id) {
					throw new Error(
						`Доступ в инвентарь ${username} закрыт для ${user.id}`
					)
				}
			}
		}

		const thingsCount = await AccountThing.scope({
			method: ['withThings', profile.id],
		}).count()

		const types = await ThingType.findAll({
			order: [['sort']],
		})

		const data = {
			profile,
			thingsCount,
			types,
			title: `Инвентарь ${username}`,
		}

		// Количество запросов на обмен
		data.tradesCount = await Trade.count({
			where: {
				toId: profile.id,
				status: 0,
			},
		})

		return data
	}

	// Статистика
	async statistics(statData) {
		const { account } = statData
		if (!account) throw new Error('Нет необходимых данных')

		const data = { profile: account }

		// Общая статистика
		data.total = await this._getTotal(account.id)

		// Стата за мафию
		data.role = await this._getRoles(account.id)

		// Игровые действия
		data.action = await this._getGameActions(account.id)

		// Игровые факты
		data.fact = await this._getGameFacts(account.id)

		return data
	}

	// Общая статистика
	async _getTotal(accountId) {
		const total = {}
		const where = {
			accountId,
			type: GameEvent.eventTypes.RESULT,
			active: true,
		}

		// Все игры
		total.all = await GameEvent.count({ where })

		// Выигранные
		where.value = GameEvent.resultEvents.WIN
		total.win = await GameEvent.count({ where })

		// Проигранные
		where.value = GameEvent.resultEvents.LOOSE
		total.loose = await GameEvent.count({ where })

		// Ничья
		where.value = GameEvent.resultEvents.DRAW
		total.draw = await GameEvent.count({ where })

		// Тайм
		where.value = GameEvent.resultEvents.TIMEOUT
		total.timeout = await GameEvent.count({ where })

		return total
	}

	// Статистика по ролям
	async _getRoles(accountId) {
		const role = {}

		// Стата за мафию
		role.mafia = await this._getRole(accountId, [
			Role.roles.MAFIA,
			Role.roles.ADVOCATE,
			Role.roles.LOVER,
		])

		// Стата за кома
		role.komissar = await this._getRole(accountId, [
			Role.roles.KOMISSAR,
			Role.roles.SERGEANT,
		])

		// Стата за честных
		role.citizen = await this._getRole(accountId, [
			Role.roles.CITIZEN,
			Role.roles.DOCTOR,
			Role.roles.CHILD,
		])

		// Стата за маньяка
		role.maniac = await this._getRole(accountId, Role.roles.MANIAC)

		return role
	}

	// Статистика по роли
	async _getRole(accountId, roleId) {
		const role = {}

		const req = {
			where: {
				accountId,
				type: GameEvent.eventTypes.RESULT,
			},
			include: [
				{
					model: Game,
					required: true,
					include: [
						{
							model: GamePlayer,
							as: 'players',
							where: {
								accountId,
								roleId,
							},
							required: true,
						},
					],
				},
			],
		}

		// Всего
		role.all = await GameEvent.count(req)

		// Побед
		req.where.value = GameEvent.resultEvents.WIN
		role.win = await GameEvent.count(req)

		// Поражений
		req.where.value = GameEvent.resultEvents.LOOSE
		role.loose = await GameEvent.count(req)

		return role
	}

	// Игровая статистика
	async _getGameActions(accountId) {
		const action = {}
		const where = {
			accountId,
			type: GameEvent.eventTypes.ACTION,
			active: true,
		}

		// Количество убийств за мафию
		where.value = GameEvent.actionEvents.MAF_KILL
		action.maf_kill = await GameEvent.count({ where })

		// Количество промахов за мафию
		where.value = GameEvent.actionEvents.MAF_MISS
		action.maf_miss = await GameEvent.count({ where })

		// Количество трупов за маньяка
		where.value = GameEvent.actionEvents.MAN_KILL
		action.man_kill = await GameEvent.count({ where })

		// Найденных мафов
		where.value = GameEvent.actionEvents.KOM_FIND_MAF
		action.kom_find_maf = await GameEvent.count({ where })

		// Спасений доктором
		where.value = GameEvent.actionEvents.DOC_SAVE
		action.doc_save = await GameEvent.count({ where })

		// Спасений адвокатом
		where.value = GameEvent.actionEvents.ADV_SAVE
		action.adv_save = await GameEvent.count({ where })

		// Заморозок
		where.value = GameEvent.actionEvents.LOVER_FREEZ
		action.lover_freez = await GameEvent.count({ where })

		return action
	}

	// Игровые показатели
	async _getGameFacts(accountId) {
		const fact = {}
		const where = {
			accountId,
			type: GameEvent.eventTypes.FACT,
			active: true,
		}

		// Первая посадка
		where.value = GameEvent.factEvents.FIRST_ZEK
		fact.first_zek = await GameEvent.count({ where })

		// Первая посадка
		where.value = GameEvent.factEvents.FIRST_CORSE
		fact.first_course = await GameEvent.count({ where })

		// Первая посадка
		where.value = GameEvent.factEvents.FIRST_CHECK
		fact.first_check = await GameEvent.count({ where })

		return fact
	}
}

module.exports = new ProfileService()
