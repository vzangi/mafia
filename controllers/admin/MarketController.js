const service = require('../../services/admin/MarketService')
const BaseAdminController = require('./BaseAdminController')

class MarketController extends BaseAdminController {
  // Меню админки маркета
  async index(req, res, next) {
    try {
      res.render('pages/admin/market/admin')
    } catch (error) {
      next()
    }
  }

  // Список типов
  async typesList(req, res, next) {
    try {
      const data = await service.typesList()
      res.render('pages/admin/market/types/list', data)
    } catch (error) {
      next()
    }
  }

  // Список классов
  async classesList(req, res, next) {
    try {
      const data = await service.classesList()
      res.render('pages/admin/market/classes/list', data)
    } catch (error) {
      next()
    }
  }

  // Список коллекций
  async collectionsList(req, res, next) {
    try {
      const data = await service.collectionsList()
      res.render('pages/admin/market/collections/list', data)
    } catch (error) {
      next()
    }
  }

  // Добавление типа
  async createType(req, res, next) {
    try {
      const { name, sort } = req.body
      await service.createType(name, sort)
      res.redirect('/market/types')
    } catch (error) {
      next()
    }
  }

  // Добавление коллекции
  async createCollection(req, res, next) {
    try {
      const { name, sort } = req.body
      await service.createCollection(name, sort)
      res.redirect('/market/collections')
    } catch (error) {
      next()
    }
  }

  // Редактирование типа
  async editType(req, res, next) {
    try {
      const { id } = req.params
      const data = await service.editType(id)
      res.render('pages/admin/market/types/edit', data)
    } catch (error) {
      next()
    }
  }

  // Редактирование класса
  async editClass(req, res, next) {
    try {
      const { id } = req.params
      const data = await service.editClass(id)
      res.render('pages/admin/market/classes/edit', data)
    } catch (error) {
      next()
    }
  }

  // Редактирование коллекции
  async editCollection(req, res, next) {
    try {
      const { id } = req.params
      const data = await service.editCollection(id)
      res.render('pages/admin/market/collections/edit', data)
    } catch (error) {
      next()
    }
  }
}

module.exports = new MarketController()
