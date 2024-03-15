const express = require('express')
const router = express.Router()
const controller = require('../controllers/MarketController')
const { seoMiddelware } = require('../middlewares/SeoMiddleware')

// Установка заголовков и описаний страниц
router.use(seoMiddelware)

// Маркет
router.get('/', controller.market)

// Вещь
router.get('/thing/:id', controller.thing)

// Лоты игрока
router.get('/my', controller.myLots)

module.exports = router
