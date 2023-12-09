const express = require('express')
const router = express.Router()
const controller = require('../controllers/GameController')

// Игра
router.get('/:id', controller.game)

module.exports = router
