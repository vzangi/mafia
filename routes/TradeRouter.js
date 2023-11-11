const express = require('express')
const router = express.Router()
const controller = require('../controllers/TradeController')
const { isAuth } = require('../middlewares/AuthMiddleware')


// Новый обмен
router.get('/', isAuth, controller.tradesList)

// Новый обмен
router.get('/new/:username', isAuth, controller.newTradePage)

module.exports = router
