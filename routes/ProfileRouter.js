const express = require('express')
const router = express.Router()
const controller = require('../controllers/ProfileController')
const {
	validator,
	validationMiddleware,
} = require('../middlewares/ValidatorsMiddleware')
const { isAuth } = require('../middlewares/AuthMiddleware')

// Использую отправку данных через формы
router.use(express.urlencoded({ extended: true }))

// Просмотр своего профиля
router.get('/', isAuth, controller.showAccountByNik)

// Друзья
router.get('/friends', isAuth, controller.friends)

// Запросы в друзья
router.get('/friends/requests', controller.friendsRequest)

// Форма смены пароля
router.get('/change-password', isAuth, controller.changePasswordForm)

// Процедура смены пароля
router.post(
	'/change-password',
	isAuth,
	validator.password,
	validationMiddleware,
	controller.changePassword
)

// Статистика игрока по нику
router.get('/statistics/:username', controller.statistics)

// Статистика текущего игрока
router.get('/statistics', controller.statistics)

// Кошелёк
router.get('/wallet', isAuth, controller.wallet)

// Настройки профиля
router.get('/settings', isAuth, controller.settings)

// Смена автарки
router.post('/settings', isAuth, controller.changeAvatar)

// Смена бэкграунда
router.post('/changebg', isAuth, controller.changeBG)

// Уведомления
router.get('/notifications', isAuth, controller.notifications)

// Удаление уведомления
router.post('/notifications', isAuth, controller.removeNotify)

// Удаление уведомления
router.post('/offtelegram', isAuth, controller.offTelegramNotifes)

// Инвентарь игрока
router.get('/things', controller.myInventory)

// Инвентарь игрока
router.get('/things/:username', controller.inventory)

// Друзья игрока
router.get('/friends/:nik', controller.friends)

// Профиль игрока по нику
router.get('/:nik', controller.showAccountByNik)

// Профиль игрока по нику
router.get('/new/:nik', controller.newShowAccountByNik)

module.exports = router
