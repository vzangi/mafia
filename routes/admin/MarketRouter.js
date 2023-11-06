const express = require('express')
const router = express.Router()
const controller = require('../../controllers/admin/MarketController')

router.use(controller.isSuperAdmin)

// Меню админки маркета
router.get('/admin', controller.index)

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

module.exports = router
