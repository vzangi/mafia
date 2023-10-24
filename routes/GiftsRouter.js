const express = require('express')
const router = express.Router()
const controller = require('../controllers/GiftsController')
const { isAuth } = require('../middlewares/AuthMiddleware')
const isSuperAdmin = controller.isSuperAdmin

router.use(isAuth)

// Страница с возможностью дарить открытки
router.get('/', controller.gift)

// Страница со списком групп
router.get('/groups', isSuperAdmin, controller.groups)

// Страница с формой редактирования группы
router.get('/group', isSuperAdmin, controller.group)

// Создание группы
router.post('/group/create', isSuperAdmin, controller.addGroup)

// Редактирование группы
router.post('/group/edit', isSuperAdmin, controller.editGroup)

// Добавление открытки
router.post('/create', isSuperAdmin, controller.addGift)

module.exports = router
