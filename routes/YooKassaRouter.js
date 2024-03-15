const express = require('express')
const router = express.Router()
const controller = require('../controllers/YooKassaController')

// Пришёл ответ от ЮМоney на тестовую оплату
router.post('/yootest', controller.testResponse)

router.post('/yoo', controller.response)

module.exports = router
