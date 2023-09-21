const express = require('express')
const router = express.Router()
const profile = require('../controllers/ProfileController')
const {
    validator,
    validationMiddleware
} = require('../middlewares/ValidatorsMiddleware')
const { isAuth } = require('../middlewares/AuthMiddleware')

// Использую отправку данных через формы
router.use(express.urlencoded({ extended: true }))

// Просмотр своего профиля
router.get('/', 
    isAuth, 
    profile.showUserAccount)

// Просмотр чужого профиля
router.get('/:id', 
    profile.showUserAccount)

// Друзья
router.get('/friends', 
    isAuth, 
    profile.friends)

// Друзья в чужом профиле
router.get('/:id/friends', 
    profile.friends)

// Запросы в друзья
router.get('/friends/requests',
    profile.withAccount,
    profile.friendsRequest)

// Форма смены пароля
router.get('/change-password', 
    isAuth, 
    profile.changePasswordForm)

// Процедура смены пароля
router.post('/change-password',
    isAuth,
    validator.password,
    validationMiddleware,
    profile.changePassword)

module.exports = router