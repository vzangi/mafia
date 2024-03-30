const express = require('express')
const router = express.Router()
const controller = require('../controllers/GameController')

// Игра
router.get('/game/:id', controller.game)

// Текущие игры
router.get('/games/current', controller.current)

// Архив игр сегодняшнего дня
router.get('/games/archive', controller.archive)

// Архив моих игр
router.get('/games/archive/my', controller.userArchive)

module.exports = router
