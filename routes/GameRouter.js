const express = require('express')
const router = express.Router()
const controller = require('../controllers/GameController')

// Игра
router.get('/game/:id', controller.game)

// Текущие игры
router.get('/games/current', controller.current)

module.exports = router
