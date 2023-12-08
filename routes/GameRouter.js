const express = require('express')
const router = express.Router()
const controller = require('../controllers/GameController')

// Лог игры
router.get('/:id/log', controller.log)

// Игра
router.get('/:id', controller.game)

module.exports = router
