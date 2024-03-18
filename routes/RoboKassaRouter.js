const express = require('express')
const router = express.Router()
const controller = require('../controllers/RoboKassaController')

// Пришёл ответ от Robokassa
router.post('/robokassa_result', controller.testSuccessResponse)

module.exports = router
