const express = require('express')
const router = express.Router()
const controller = require('../controllers/ApiController')

// Использую отправку данных через формы
router.use(express.urlencoded({ extended: true }))

router.get('/lastMessages', controller.lastMessages)
router.get('/getSmiles', controller.getSmiles)

module.exports = router
