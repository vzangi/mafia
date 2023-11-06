const express = require('express')
const router = express.Router()
const controller = require('../../controllers/admin/GiftController')

router.use(controller.isSuperAdmin)

// Страница со списком групп
router.get('/groups', controller.groups)

// Страница с формой редактирования группы
router.get('/group/:id', controller.group)

// Создание группы
router.post('/group/create', controller.addGroup)

// Редактирование группы
router.post('/group/edit', controller.editGroup)

// Добавление открытки
router.post('/create', controller.addGift)

// Удаление открытки
router.post('/remove', controller.removeGift)

// Форма редактирования открытки
router.get('/edit/:id', controller.giftEditForm)

// Редактирования открытки
router.post('/edit', controller.editGift)

module.exports = router
