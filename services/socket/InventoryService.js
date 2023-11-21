const Account = require('../../models/Account')
const AccountThing = require('../../models/AccountThing')
const Thing = require('../../models/Thing')
const NaborThing = require('../../models/NaborThing')
const sequelize = require('../../units/db')
const BaseService = require('./BaseService')

class InventoryService extends BaseService {
  // Список вещей в инвентаре
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

    if (kraftItem.thing.thingclassId > 3) {
      throw new Error('Крафт вещей этого класса не поддерживается')
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

  // Активация VIP пропуска
  async vipActivate(id) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!id) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await AccountThing.findByPk(id, {
      include: [{ model: Thing }, { model: Account }],
    })

    if (!thing) {
      throw new Error('Вещь не найдена')
    }

    if (thing.accountId != user.id) {
      throw new Error('На чужое позарился!?')
    }

    if (thing.thing.thingtypeId != 2) {
      throw new Error('Активировать можно только пропуска')
    }

    if (thing.account.vip) {
      throw new Error('У тебя уже активирован VIP статус')
    }

    const dt = new Date()

    if (thing.thing.thingclassId == 2) {
      // VIP на неделю
      dt.setDate(dt.getDate() + 7)
    }
    if (thing.thing.thingclassId == 3) {
      // VIP на месяц
      dt.setDate(dt.getDate() + 31)
    }

    // Активирую VIP статус аккаунта
    Account.update(
      {
        vipTo: dt.toISOString(),
      },
      {
        where: {
          id: user.id,
        },
      }
    )

    // Удаляю пропуск из инвентаря
    thing.accountId = null
    await thing.save()
  }

  // Получение списка вещей набора или кейса
  async getNaborThings(naborId) {
    if (!naborId) {
      throw new Error('Нет необходимых данных')
    }

    const things = await NaborThing.findAll({
      where: { naborId },
      include: [
        {
          model: Thing,
        },
      ],
      order: [['thing', 'thingclassId']],
    })

    if (!things) {
      throw new Error('Набор не найден')
    }

    return things
  }

  // Открыть набор
  async openNabor(naborId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!naborId) {
      throw new Error('Нет необходимых данных')
    }

    const nabor = await AccountThing.findByPk(naborId, {
      where: { accountId: user.id },
      include: [{ model: Thing }],
    })

    if (!nabor) {
      throw new Error('Набор не найден')
    }

    if (nabor.thing.thingtypeId != 3) {
      throw new Error('Вещь не является подарочным набором')
    }

    // Получаю класс предмета, который будет получен из набора
    const thingclassId = this._getRndClass(true)

    // Получаю случайный предмет в наборе, соответствующие классу
    const thing = await NaborThing.findOne({
      where: { naborId: nabor.thingId },
      include: [
        {
          model: Thing,
          where: { thingclassId },
        },
      ],
      order: sequelize.random(),
    })

    if (!thing) {
      throw new Error('Не удалось открыть набор, попробуй ещё раз')
    }

    const newThing = await AccountThing.create({
      accountId: user.id,
      thingId: thing.thing.id,
    })

    nabor.accountId = null
    await nabor.save()

    const data = await AccountThing.findByPk(newThing.id, {
      include: [{ model: Thing }],
    })

    return data
  }

  // Открыть набор
  async openKeis(keisId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!keisId) {
      throw new Error('Нет необходимых данных')
    }

    const keis = await AccountThing.findByPk(keisId, {
      where: { accountId: user.id },
      include: [{ model: Thing }],
    })

    if (!keis) {
      throw new Error('Кейс не найден')
    }

    if (keis.thing.thingtypeId != 4) {
      throw new Error('Вещь не является кейсом')
    }

    // Ищу ключ от кейса в инвентаре игрока
    const key = await AccountThing.findOne({
      where: {
        accountId: user.id,
        marketPrice: null,
      },
      include: [
        {
          model: Thing,
          where: {
            thingtypeId: 5,
            thingcollectionId: keis.thing.thingcollectionId,
          },
        },
      ],
    })

    if (!key) {
      throw new Error(
        'Для того, чтобы открыть кейс в инвентаре должен быть соответсвующий ключ'
      )
    }

    // Получаю класс предмета, который будет получен из кейса
    const thingclassId = this._getRndClass()

    // Получаю случайный предмет в наборе, соответствующие классу
    const thing = await NaborThing.findOne({
      where: { naborId: keis.thingId },
      include: [
        {
          model: Thing,
          where: { thingclassId },
        },
      ],
      order: sequelize.random(),
    })

    if (!thing) {
      throw new Error('Не удалось открыть набор, попробуй ещё раз')
    }

    const newThing = await AccountThing.create({
      accountId: user.id,
      thingId: thing.thing.id,
    })

    // Удаляю кейс из инвентаря
    keis.accountId = null
    await keis.save()

    // Удаляю ключ из инвентаря
    key.accountId = null
    await key.save()

    const data = { keyId: key.id }
    data.thing = await AccountThing.findByPk(newThing.id, {
      include: [{ model: Thing }],
    })

    return data
  }

  // Получение случайного класса для подарочного набора или кейса
  _getRndClass(nabor = false) {
    // Случайное число, для определения класса
    const rnd = Math.random()

    if (!nabor && rnd < 0.005) return 5 // Эксклюзивный
    if (rnd < 0.1) return 4 // Высочайший
    if (rnd < 0.2) return 3 // Особенный
    if (rnd < 0.3) return 2 // Стандартный
    return 1 // Обычный
  }
}

module.exports = InventoryService
