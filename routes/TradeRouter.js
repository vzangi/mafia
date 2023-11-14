const express = require('express')
const router = express.Router()
const controller = require('../controllers/TradeController')
const { isAuth } = require('../middlewares/AuthMiddleware')

router.use(isAuth)

// Список активных предложений обмена
router.get('/', controller.tradesList)

// История обменов
router.get('/history', controller.tradesHistory)

// Список отправленных предложений обмена
router.get('/sended', controller.sendedTrades)

// Новый обмен с игроком
router.get('/new/:username', controller.newTradePage)

module.exports = router
