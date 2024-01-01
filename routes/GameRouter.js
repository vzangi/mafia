const express = require('express')
const router = express.Router()
const controller = require('../controllers/GameController')

// Игра
router.get('/game/:id', controller.game)

// Текущие игры
router.get('/games/current', controller.current)

// Архив игр по дате
router.get('/games/archive/:year/:month/:day', controller.archive)

// Архив игр сегодняшнего дня
router.get('/games/archive', controller.archive)

module.exports = router
