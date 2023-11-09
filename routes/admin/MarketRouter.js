const express = require('express')
const router = express.Router()
const controller = require('../../controllers/admin/MarketController')

router.use(controller.isSuperAdmin)

// Меню админки маркета
router.get('/things', controller.index)

// Список типов
router.get('/types', controller.typesList)

// Список классов
router.get('/classes', controller.classesList)

// Список классов
router.get('/collections', controller.collectionsList)

// Добавление типа
router.post('/types/create', controller.createType)

// Добавление коллекции
router.post('/collections/create', controller.createCollection)

// Редактирование типа
router.get('/types/:id', controller.editType)

// Редактирование класса
router.get('/classes/:id', controller.editClass)

// Редактирование класса
router.get('/collections/:id', controller.editCollection)

// Обновление типа
router.post('/types/update', controller.updateType)

// Обновление класса
router.post('/classes/update', controller.updateClass)

// Обновление коллекции
router.post('/collections/update', controller.updateCollection)

// Страница добавления новой вещи
router.get('/things/add', controller.addThing)

// Процедура создания новой вещи
router.post('/things/create', controller.createThing)

// Страница редактирования вещи
router.get('/things/edit/:id', controller.editThing)

// Процедура обновления вещи
router.post('/things/update', controller.updateThing)

// Процедура обновления вещи
router.post('/things/gift', controller.giftThing)

module.exports = router
