const express = require('express')
const router = express.Router()
const pages = require('../controllers/GiftsController')
const { isAuth, userToTemplate } = require('../middlewares/AuthMiddleware')

// Страница с возможностью дарить открытки
router.get('/', isAuth, pages.gift)

// Страница со списком групп
router.get('/groups', isAuth, userToTemplate, pages.groups)

// Страница с формой редактирования группы
router.get('/group', isAuth, userToTemplate, pages.group)

// Создание группы
router.post('/group/create', isAuth, userToTemplate, pages.addGroup)

// Редактирование группы
router.post('/group/edit', isAuth, userToTemplate, pages.editGroup)

// Добавление открытки
router.post('/create', isAuth, userToTemplate, pages.addGift)

module.exports = router
