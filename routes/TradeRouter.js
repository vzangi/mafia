const express = require('express')
const router = express.Router()
const controller = require('../controllers/TradeController')

// Новый обмен
router.get('/new/:username', controller.newTradePage)

module.exports = router
