const express = require('express')
const router = express.Router()
const pages = require('../controllers/GiftsController')
const { isAuth } = require('../middlewares/AuthMiddleware')

// Страница с возможностью дарить открытки
router.get('/', isAuth, pages.gift)

module.exports = router
