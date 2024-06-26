const service = require('../services/ProfileService')
const log = require('../units/customLog')

class ProfileController {
	// Переход в профиль по никнейму
	async showAccountByNik(req, res, next) {
		try {
			const { nik } = req.params
			const { user } = req

			const data = await service.profileByNik(nik, user)
			res.render('pages/profile/new-profile', data)
		} catch (error) {
			log(error)
			next()
		}
	}

	// Переход в профиль по никнейму
	async oldShowAccountByNik(req, res, next) {
		try {
			const { nik } = req.params
			const { user } = req

			const data = await service.profileByNik(nik, user)
			res.render('pages/profile/profile', data)
		} catch (error) {
			log(error)
			next()
		}
	}

	// Список друзей
	async friends(req, res, next) {
		try {
			let { nik } = req.params
			let data = {}

			if (nik) {
				data = await service.friendsList(nik)
			} else {
				data = await service.currentUserFriendsList(req.user)
			}
			res.render('pages/profile/friends', data)
		} catch (error) {
			log(error)
			next()
		}
	}

	// Список друзей
	async newFriends(req, res, next) {
		try {
			let { nik } = req.params
			let data = {}

			if (nik) {
				data = await service.newFriendsList(nik, req.user)
			} else {
				data = await service.newCurrentUserFriendsList(req.user)
			}
			res.render('pages/profile/new-friends', data)
		} catch (error) {
			log(error)
			next()
		}
	}

	// Запросы на дружбу
	async friendsRequest(req, res, next) {
		try {
			const { account } = req

			const data = await service.friendsRequest(account)
			res.render('pages/profile/friends-requests', data)
		} catch (error) {
			log(error)
			next()
		}
	}

	// Кошелёк
	async wallet(req, res, next) {
		try {
			const { account } = req

			const data = await service.wallet(account)
			res.render('pages/profile/wallet', data)
		} catch (error) {
			log(error)
			next()
		}
	}

	// Отображение страницы с настойками профиля
	async settings(req, res, next) {
		try {
			const { account } = req

			const data = await service.settings(account)
			res.render('pages/profile/settings', data)
		} catch (error) {
			log(error)
			next()
		}
	}

	// Форма изменения пароля
	changePasswordForm(req, res) {
		res.render('pages/profile/change-password', {
			title: 'Смена пароля',
		})
	}

	// Процедура изменения пароля
	async changePassword(req, res) {
		try {
			const { password, passwordConfirm } = req.body
			const { account } = req

			await service.changePassword(account, password, passwordConfirm)
			res.json([{ status: 0, msg: 'Пароль успешно изменён' }])
		} catch (error) {
			log(error)
			return res.status(400).json([{ msg: error.message }])
		}
	}

	// Процедура смены автарки
	async changeAvatar(req, res) {
		try {
			const { account } = req
			if (!req.files) {
				throw new Error('Аватарка не выбрана')
			}
			const { avatar } = req.files

			const fileName = await service.changeAvatar(account, avatar)
			// Возвращаю ответ с именем новой автарки
			res.json({ fileName })
		} catch (error) {
			log(error)
			return res.status(400).json([{ msg: error.message }])
		}
	}

	// Процедура смены бэкграунда
	async changeBG(req, res) {
		try {
			const { account } = req
			if (!req.files) {
				throw new Error('Файл не выбран')
			}
			const { bg } = req.files

			const fileName = await service.changeBG(account, bg)
			// Возвращаю ответ с именем нового бэкграунда
			res.json({ fileName })
		} catch (error) {
			log(error)
			return res.status(400).json([{ msg: error.message }])
		}
	}

	async notifications(req, res, next) {
		try {
			const { account } = req

			const data = await service.notifications(account)
			res.render('pages/profile/notifications', data)
		} catch (error) {
			log(error)
			next()
		}
	}

	async removeNotify(req, res) {
		try {
			const { notifyId } = req.body
			const { account } = req

			const data = await service.removeNotify(account, notifyId)
		} catch (error) {
			log(error)
		}
		res.redirect('/profile/notifications')
	}

	// Отключение уведомлений в telegram
	async offTelegramNotifes(req, res) {
		try {
			const { account } = req
			await service.offTelegramNotifes(account)
		} catch (error) {
			log(error)
		}
		res.redirect('/profile/notifications')
	}

	// Инвентарь игрока по нику
	async inventory(req, res) {
		try {
			const { username } = req.params
			const { user } = req
			const data = await service.inventory(username, user)
			res.render('pages/profile/new-inventory', data)
		} catch (error) {
			log(error)
			res.redirect('/profile')
		}
	}

	// Свой инвентарь
	async myInventory(req, res) {
		try {
			const { account } = req
			if (!account) throw new Error('Не авторизован')
			const { username } = req.account
			const data = await service.inventory(username, account)
			res.render('pages/profile/new-inventory', data)
		} catch (error) {
			log(error)
			res.redirect('/profile')
		}
	}

	// Статистика
	async statistics(req, res) {
		try {
			const { username } = req.params
			const { from, to } = req.query
			const statData = { from, to, username }
			if (!username && req.account) {
				statData.username = req.account.username
			}
			statData.user = req.user

			const data = await service.statistics(statData)

			if (!username && req.account) {
				data.my = true
			}
			if (req.account) {
				if (req.account.username == username) {
					data.my = true
				}
			}

			res.render('pages/profile/new-statistics', data)
		} catch (error) {
			log(error)
			console.log(error)
			res.redirect('/profile')
		}
	}
}

module.exports = new ProfileController()
