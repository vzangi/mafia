const ThingType = require('../../models/ThingType')
const ThingClass = require('../../models/ThingClass')
const ThingCollection = require('../../models/ThingCollection')

class MarketService {
  // Список типов
  async typesList() {
    const types = await ThingType.findAll({ order: [['sort']] })
    const data = { types }
    return data
  }

  // Список классов
  async classesList() {
    const classes = await ThingClass.findAll({ order: [['sort']] })
    const data = { classes }
    return data
  }

  // Список коллекций
  async collectionsList() {
    const collections = await ThingCollection.findAll({ order: [['sort']] })
    const data = { collections }
    return data
  }

  // Добавление типа предмета
  async createType(name, sort) {
    if (!name || !sort) {
      throw new Error('Нет необходимых данных')
    }
    await ThingType.create({
      name,
      sort,
    })
  }

  // Добавление коллекции
  async createCollection(name, sort) {
    if (!name || !sort) {
      throw new Error('Нет необходимых данных')
    }
    await ThingCollection.create({
      name,
      sort,
    })
  }

  // Редактирование типа
  async editType(id) {
    if (!id) {
      throw new Error('Нет необходимых данных')
    }
    const type = await ThingType.findByPk(id)
    const data = { type }
    return data
  }

  // Редактирование класса
  async editClass(id) {
    if (!id) {
      throw new Error('Нет необходимых данных')
    }
    const thingClass = await ThingClass.findByPk(id)
    const data = { thingClass }
    return data
  }

  // Редактирование коллекции
  async editCollection(id) {
    if (!id) {
      throw new Error('Нет необходимых данных')
    }
    const collection = await ThingCollection.findByPk(id)
    const data = { collection }
    return data
  }
}

module.exports = new MarketService()
