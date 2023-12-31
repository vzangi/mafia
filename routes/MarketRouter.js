const express = require('express')
const router = express.Router()
const controller = require('../controllers/MarketController')

// Маркет
router.get('/', controller.market)

// Вещь
router.get('/thing/:id', controller.thing)

// Лоты игрока
router.get('/my', controller.myLots)

module.exports = router
