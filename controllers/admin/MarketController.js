const service = require('../../services/admin/MarketService')
const BaseAdminController = require('./BaseAdminController')

class MarketController extends BaseAdminController {
  // Меню админки маркета
  async index(req, res, next) {
    try {
      const data = await service.thingsList()
      res.render('pages/admin/market/things', data)
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
      next(error)
    }
  }

  // Список классов
  async classesList(req, res, next) {
    try {
      const data = await service.classesList()
      res.render('pages/admin/market/classes/list', data)
    } catch (error) {
      next(error)
    }
  }

  // Список коллекций
  async collectionsList(req, res, next) {
    try {
      const data = await service.collectionsList()
      res.render('pages/admin/market/collections/list', data)
    } catch (error) {
      next(error)
    }
  }

  // Добавление типа
  async createType(req, res, next) {
    try {
      const { name, sort } = req.body
      await service.createType(name, sort)
      res.redirect('/market/types')
    } catch (error) {
      next(error)
    }
  }

  // Добавление коллекции
  async createCollection(req, res, next) {
    try {
      const { name, sort } = req.body
      await service.createCollection(name, sort)
      res.redirect('/market/collections')
    } catch (error) {
      next(error)
    }
  }

  // Редактирование типа
  async editType(req, res, next) {
    try {
      const { id } = req.params
      const data = await service.editType(id)
      res.render('pages/admin/market/types/edit', data)
    } catch (error) {
      next(error)
    }
  }

  // Редактирование класса
  async editClass(req, res, next) {
    try {
      const { id } = req.params
      const data = await service.editClass(id)
      res.render('pages/admin/market/classes/edit', data)
    } catch (error) {
      next(error)
    }
  }

  // Редактирование коллекции
  async editCollection(req, res, next) {
    try {
      const { id } = req.params
      const data = await service.editCollection(id)
      res.render('pages/admin/market/collections/edit', data)
    } catch (error) {
      next(error)
    }
  }

  // Обновление типа
  async updateType(req, res, next) {
    try {
      const { id, name, sort } = req.body
      await service.updateType(id, name, sort)
      res.redirect('/market/types')
    } catch (error) {
      next(error)
    }
  }

  // Обновление класса
  async updateClass(req, res, next) {
    try {
      const { id, name, sort } = req.body
      await service.updateClass(id, name, sort)
      res.redirect('/market/classes')
    } catch (error) {
      next(error)
    }
  }

  // Обновление коллекции
  async updateCollection(req, res, next) {
    try {
      const { id, name, sort } = req.body
      await service.updateCollection(id, name, sort)
      res.redirect('/market/collections')
    } catch (error) {
      next(error)
    }
  }

  // Страница добавления новой вещи
  async addThing(req, res, next) {
    try {
      const data = await service.addThing()
      res.render('pages/admin/market/things/add', data)
    } catch (error) {
      next(error)
    }
  }

  // Процедура создания вещи
  async createThing(req, res, next) {
    try {
      const {
        name,
        description,
        price,
        forsale,
        thingtypeId,
        thingclassId,
        thingcollectionId,
        items,
      } = req.body
      const { file } = req.files
      await service.createThing(
        name,
        description,
        price,
        forsale,
        thingtypeId,
        thingclassId,
        thingcollectionId,
        items,
        file
      )
      res.redirect('/market/things')
    } catch (error) {
      next(error)
    }
  }

  // Страница редактирования вещи
  async editThing(req, res, next) {
    try {
      const { id } = req.params
      const data = await service.editThing(id)
      res.render('pages/admin/market/things/edit', data)
    } catch (error) {
      next(error)
    }
  }

  // Процедура обновления вещи
  async updateThing(req, res, next) {
    try {
      const {
        id,
        name,
        description,
        price,
        forsale,
        thingtypeId,
        thingclassId,
        thingcollectionId,
        items,
      } = req.body
      let file = null
      if (req.files) {
        file = req.files.file
      }
      await service.updateThing(
        id,
        name,
        description,
        price,
        forsale,
        thingtypeId,
        thingclassId,
        thingcollectionId,
        items,
        file
      )
      res.redirect('/market/things')
    } catch (error) {
      next(error)
    }
  }

  // Подарить вещь игроку
  async giftThing(req, res, next) {
    try {
      const { id, username } = req.body
      await service.giftThing(id, username)
      res.json({ status: 0 })
    } catch (error) {
      res.status(400).json({ status: 1, msg: error.message })
    }
  }
}

module.exports = new MarketController()
