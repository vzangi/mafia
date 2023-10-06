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

// Просмотр чужого профиля
router.get('/:id', controller.showUserAccount)

// Друзья
router.get('/friends', isAuth, controller.friends)

// Друзья в чужом профиле
router.get('/:id/friends', controller.friends)

// Запросы в друзья
router.get('/friends/requests', withAccount, controller.friendsRequest)

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
router.get('/wallet', withAccount, controller.wallet)

// Настройки профиля
router.get('/settings', withAccount, controller.settings)

// Смена автарки
router.post('/settings', withAccount, controller.changeAvatar)

module.exports = router
