const express = require('express')
const router = express.Router()
const controller = require('../controllers/RoboKassaController')

// Пришёл ответ от Robokassa
router.get('/robokassa_result', controller.testSuccessResponse)

// Пришёл ответ от Robokassa
router.get('/robokassa_success', controller.testSuccessResponse)

// Пришёл ответ от Robokassa
router.get('/robokassa_fail', controller.testSuccessResponse)

module.exports = router
