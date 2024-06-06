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

// Сраница со списком топа недели
router.get('/top-of-week', pages.topOfWeek)

// Ручка очистки топа недели
router.get('/clear-top-of-week/:secret', pages.clearTopOfWeek)

// Список пользователей
router.get('/users', pages.users)

// Список жалоб
router.get('/claims', pages.claims)

// Страница репорта
router.get('/report', pages.reportForm)

// Страница репорта
router.post('/report', pages.report)

// Форма репорта
router.get('/report-form', pages.ajaxReportForm)

// Обработка репорта
router.post('/report-form', pages.sendReport)

// Список отзывов
router.get('/reports', pages.getReports)

router.get('/pc', pages.privatechats)

router.get('/inventory', pages.blogInventory)

// Cтраницы со статическим содержимым
router.use('/', require('./BlogRouter'))

module.exports = router
