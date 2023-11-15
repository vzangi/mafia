const Account = require('../../models/Account')
const AccountThing = require('../../models/AccountThing')
const Thing = require('../../models/Thing')
const sequelize = require('../../units/db')
const BaseService = require('./BaseService')

class InventoryService extends BaseService {
  // Крафт
  async kraft(ids) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!ids) {
      throw new Error('Нет необходимых данных')
    }

    // id должны быть уникальными
    const notUique = ids.filter((item, index) => {
      return ids.indexOf(item) !== index
    }).length

    if (notUique) {
      throw new Error('Переданы не уникальные значения')
    }

    const cnt = await AccountThing.count({
      where: { id: ids, accountId: user.id },
    })

    if (cnt != 10) {
      throw new Error(
        'Некоторые из переданных вещей не найдены в твоём инвентаре'
      )
    }

    // Случайное число от 0 до 9
    // Нужно, чтоюы выбрать одну из вещей чья коллекция будет использована для крафта вещи
    const rand10 = Math.floor(Math.random() * 10)

    // Берем id вещи
    const kraftItemId = ids[rand10]

    const kraftItem = await AccountThing.findByPk(kraftItemId, {
      include: [{ model: Thing }],
    })

    if (!kraftItem) {
      throw new Error('Не удалось выбрать вещь для крафта')
    }

    if (!kraftItem.thing.thingcollectionId) {
      throw new Error('Не удалось выбрать коллекцию для крафта')
    }

    // Берем случайную вещь из базы
    const thing = await Thing.findOne({
      where: {
        thingclassId: kraftItem.thing.thingclassId + 1,
        thingcollectionId: kraftItem.thing.thingcollectionId,
        thingtypeId: kraftItem.thing.thingtypeId,
      },
      order: sequelize.random(),
    })

    if (!thing) {
      throw new Error('Не удалось скрафтить вещь')
    }

    // Добавляем вещь в инвентарь игрока
    const kraftedThing = await AccountThing.create({
      accountId: user.id,
      thingId: thing.id,
    })

    // Удаляем вещи присланные в крафт
    await AccountThing.update(
      {
        accountId: null,
      },
      {
        where: {
          id: ids,
        },
      }
    )

    const newThing = await AccountThing.scope({
      method: ['withThings', user.id],
    }).findOne({
      where: {
        id: kraftedThing.id,
      },
    })

    return newThing
  }

  async inventoryThings(username) {
    if (!username) {
      throw new Error('Нет необходимых данных')
    }

    const profile = await Account.findOne({ where: { username } })
    if (!profile) {
      throw new Error('Пользователь с таким ником не найден')
    }

    const things = await AccountThing.scope({
      method: ['withThings', profile.id],
    }).findAll({
      order: [['id', 'desc']],
    })

    return things
  }
}

module.exports = InventoryService
