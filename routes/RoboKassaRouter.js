const express = require('express')
const router = express.Router()
const controller = require('../controllers/RoboKassaController')

// Пришёл ответ от Robokassa
router.post('/robokassa_result', controller.response)

// Успешный платёж
router.post('/robokassa_success', controller.success)

// Неудачный платёж
router.post('/robokassa_fail', controller.fail)

module.exports = router
