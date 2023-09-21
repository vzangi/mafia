const express = require('express')
const router = express.Router()
const auth = require('../controllers/AuthController')
const { 
    validator,
    validationMiddleware
} = require('../middlewares/ValidatorsMiddleware')

// Использую отправку данных через формы
router.use(express.urlencoded({ extended: true }))


// Регистрация
router.post('/register',
    validator.nik,
    validator.email,
    validator.password,
    validator.accept,
    validationMiddleware,
    auth.register)

// Авторизация
router.post('/login', auth.login)

// Выход с сайта
router.post('/logout', auth.logout)

// Подтверждение почты
router.get('/accept/:email/:hash(*)', auth.accept)

// Восстановление пароля
router.post('/restore', 
    validator.email, 
    validationMiddleware, 
    auth.restore)

// Форма смены пароля
router.get('/restore/:email/:hash(*)', auth.restorePassword)

module.exports = router