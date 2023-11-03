const express = require('express')
const router = express.Router()
const controller = require('../controllers/MarketController')

// Маркет
router.get('/', controller.market)

module.exports = router
