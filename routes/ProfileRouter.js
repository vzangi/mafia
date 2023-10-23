const express = require('express')
const router = express.Router()
const controller = require('../controllers/ProfileController')
const {
  validator,
  validationMiddleware,
} = require('../middlewares/ValidatorsMiddleware')
const { isAuth, withAccount } = require('../middlewares/AuthMiddleware')

// Использую отправку данных через формы
router.use(express.urlencoded({ extended: true }))

// Просмотр своего профиля
router.get('/', isAuth, controller.showUserAccount)

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
router.get('/wallet', controller.wallet)

// Настройки профиля
router.get('/settings', controller.settings)

// Смена автарки
router.post('/settings', withAccount, controller.changeAvatar)

// Смена автарки
router.get('/:nik', controller.showAccountByNik)

// Друзья в чужом профиле
router.get('/:nik/friends', controller.friends)

module.exports = router
