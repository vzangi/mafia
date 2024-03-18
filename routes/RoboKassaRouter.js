const express = require('express')
const router = express.Router()
const controller = require('../controllers/RoboKassaController')

// Пришёл ответ от Robokassa
router.post('/robokassa_result', controller.testResultResponse)

// Пришёл ответ от Robokassa
router.post('/robokassa_success', controller.testSuccessResponse)

// Пришёл ответ от Robokassa
router.post('/robokassa_fail', controller.testFailResponse)

module.exports = router