const express = require('express')
const router = express.Router()
const pages = require('../controllers/PagesController')
const { seoMiddelware } = require('../middlewares/SeoMiddleware')

// Установка заголовков и описаний страниц
router.use(seoMiddelware)

// Главная
router.get('/', pages.home)

// Вход на сайт
router.get('/login', pages.login)

// Регистрация
router.get('/registration', pages.registration)

// Восстановление пароля
router.get('/restore', pages.restore)

// Лобби
router.get('/lobbi', pages.lobbi)

// Список игроков онлайн
router.get('/online', pages.online)

// Сраница с открытками
router.get('/gift', pages.gift)

// Cтраницы со статическим содержимым
router.use('/', require('./BlogRouter'))

module.exports = router
