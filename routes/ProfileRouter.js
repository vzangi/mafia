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

// Кошелёк
router.get('/wallet', isAuth, controller.wallet)

// Настройки профиля
router.get('/settings', isAuth, controller.settings)

// Смена автарки
router.post('/settings', isAuth, controller.changeAvatar)

// Уведомления
router.get('/notifications', isAuth, controller.notifications)

// Удаление уведомления
router.post('/notifications', isAuth, controller.removeNotify)

// Профиль игрока по нику
router.get('/:nik', controller.showAccountByNik)

// Друзья игрока
router.get('/:nik/friends', controller.friends)

module.exports = router
