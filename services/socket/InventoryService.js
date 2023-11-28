const Account = require('../../models/Account')
const AccountThing = require('../../models/AccountThing')
const Thing = require('../../models/Thing')
const ThingType = require('../../models/ThingType')
const ThingClass = require('../../models/ThingClass')
const NaborThing = require('../../models/NaborThing')
const sequelize = require('../../units/db')
const BaseService = require('./BaseService')

// id типов вещей
const { thingTypes } = ThingType
const { thingClasses } = ThingClass

// Количество вещей в крафте
const kraftThingsCount = 10

// Количество предметов, которые можно брать в игру
const thingsInGameCount = 5

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

    // Количество переданных Id должно быть определённым
    const cnt = await AccountThing.count({
      where: { id: ids, accountId: user.id },
    })

    if (cnt != kraftThingsCount) {
      throw new Error(
        'Некоторые из переданных вещей не найдены в твоём инвентаре'
      )
    }

    // Случайное число от 0 до kraftThingsCount
    // Нужно, чтоюы выбрать одну из вещей чья коллекция будет использована для крафта вещи
    const rnd = Math.floor(Math.random() * kraftThingsCount)

    // Беру id вещи
    const kraftItemId = ids[rnd]

    // Беру вещь для получения из неё данных для крафта
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

    // Беру случайную вещь из базы
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

    // Добавляю вещь в инвентарь игрока
    const kraftedThing = await AccountThing.create({
      accountId: user.id,
      thingId: thing.id,
    })

    // Удаляю вещи присланные в крафт
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

    // Достаю созданную вещь со всеми необходимыми данными
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

    // Беру пропуск из инвентаря
    const thing = await AccountThing.findByPk(id, {
      include: [{ model: Thing }, { model: Account }],
    })

    if (!thing) {
      throw new Error('Вещь не найдена')
    }

    if (thing.accountId != user.id) {
      throw new Error('На чужое позарился!?')
    }

    if (thing.thing.thingtypeId != thingTypes.VIP) {
      throw new Error('Активировать можно только пропуска')
    }

    if (thing.account.vip) {
      throw new Error('У вас уже активирован VIP статус')
    }

    // Количество дней випа, в зависимости от типа пропуска
    // (день, неделя, месяц, год, 100 лет)
    const vipDays = [1, 7, 31, 365, 365 * 100]

    const dt = new Date()
    dt.setDate(dt.getDate() + vipDays[thing.thing.thingclassId - 1])

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

    // Вещи в наборе
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

    // Беру набор
    const nabor = await AccountThing.findByPk(naborId, {
      where: { accountId: user.id },
      include: [{ model: Thing }],
    })

    if (!nabor) {
      throw new Error('Набор не найден')
    }

    if (nabor.thing.thingtypeId != thingTypes.KIT) {
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

    // Создаю новую вещь в инвентаре игрока
    const newThing = await AccountThing.create({
      accountId: user.id,
      thingId: thing.thing.id,
    })

    // Убираю набор из инвентаря
    nabor.accountId = null
    await nabor.save()

    // Возвращаю вновь созданную вещь
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

    // Беру кейс из инвентаря
    const keis = await AccountThing.findByPk(keisId, {
      where: { accountId: user.id },
      include: [{ model: Thing }],
    })

    if (!keis) {
      throw new Error('Кейс не найден')
    }

    if (keis.thing.thingtypeId != thingTypes.KEIS) {
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
            thingtypeId: thingTypes.KEY,
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

    // Создаю новую вещь в инвентаре
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

    // Возвращаю id использованного ключа и вновь созданную вещь
    const data = { keyId: key.id }
    data.thing = await AccountThing.findByPk(newThing.id, {
      include: [{ model: Thing }],
    })

    return data
  }

  // Нацепить значок
  async takeBadge(thingId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!thingId) {
      throw new Error('Нет необходимых данных')
    }

    // Ищу значок в инвентаре
    const badge = await AccountThing.findOne({
      where: {
        id: thingId,
        accountId: user.id,
        marketPrice: null,
      },
      include: [{ model: Thing }],
    })

    if (!badge) {
      throw new Error('Значок не найден')
    }

    if (badge.thing.thingtypeId != thingTypes.BADGE) {
      throw new Error('Это не значок')
    }

    if (badge.taked) {
      throw new Error('Значок уже одет')
    }

    // Снимаем другой значок (если был одет)
    await AccountThing.update(
      {
        taked: null,
      },
      {
        where: {
          accountId: user.id,
          taked: true,
          marketPrice: null,
        },
        include: [
          {
            model: Thing,
            where: {
              thingtypeId: thingTypes.BADGE,
            },
          },
        ],
      }
    )

    // Одеваю значок
    badge.taked = true
    await badge.save()
  }

  // Снять значок
  async untakeBadge(thingId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!thingId) {
      throw new Error('Нет необходимых данных')
    }

    // Ищу значок в инвентаре
    const badge = await AccountThing.findOne({
      where: {
        id: thingId,
        accountId: user.id,
        marketPrice: null,
      },
      include: [{ model: Thing }],
    })

    if (!badge) {
      throw new Error('Значок не найден')
    }

    if (badge.thing.thingtypeId != thingTypes.BADGE) {
      throw new Error('Это не значок')
    }

    if (!badge.taked) {
      throw new Error('Значок не одет')
    }

    // Снимаю значок
    badge.taked = false
    await badge.save()
  }

  // Взять вещь в игру
  async takeThing(id) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!id) {
      throw new Error('Нет необходимых данных')
    }

    // Ищу вещь в инвентаре
    const thing = await AccountThing.findOne({
      where: {
        id,
        accountId: user.id,
        marketPrice: null,
      },
      include: [{ model: Thing }],
    })

    if (!thing) {
      throw new Error('Предмет не найден')
    }

    if (thing.thing.thingtypeId != thingTypes.THING) {
      throw new Error('Этот предмет нельзя взять в игру')
    }

    if (thing.taked) {
      throw new Error('Предмет уже взят')
    }

    // Проверяю, взят ли такой же (другой) предмет в игру
    const analog = await AccountThing.findOne({
      where: {
        accountId: user.id,
        taked: true,
      },
      include: [
        {
          model: Thing,
          where: {
            id: thing.thing.id,
          },
        },
      ],
    })

    if (analog) {
      throw new Error(
        'Такой предмет уже взят. Нельзя брать в игру два одинаковых предмета.'
      )
    }

    // Проверяю сколько предметов уже взято
    const takedCount = await AccountThing.count({
      where: {
        taked: true,
        accountId: user.id,
      },
      include: [
        {
          model: Thing,
          where: {
            thingtypeId: thingTypes.THING,
          },
        },
      ],
    })

    if (takedCount == thingsInGameCount) {
      throw new Error(
        `В игру нельзя взять больше ${thingsInGameCount} предметов`
      )
    }

    // Беру вещь
    thing.taked = true
    await thing.save()
  }

  // Возвращаю вещь в инвентарь
  async untakeThing(id) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!id) {
      throw new Error('Нет необходимых данных')
    }

    // Ищу вещь в инвентаре
    const thing = await AccountThing.findOne({
      where: {
        id,
        accountId: user.id,
        marketPrice: null,
      },
      include: [{ model: Thing }],
    })

    if (!thing) {
      throw new Error('Предмет не найден')
    }

    if (thing.thing.thingtypeId != thingTypes.THING) {
      throw new Error('Этот предмет нельзя вернуть в инвентарь')
    }

    if (!thing.taked) {
      throw new Error('Предмет не был взят в игру')
    }

    // Возвращаю предмет в инвентарь
    thing.taked = false
    await thing.save()
  }

  // Получение случайного класса для подарочного набора или кейса
  _getRndClass(nabor = false) {
    // Случайное число, для определения класса
    const rnd = Math.random()

    if (!nabor && rnd < 0.005) return 5 // Эксклюзивный
    if (rnd < 0.01) return 4 // Высочайший
    if (rnd < 0.05) return 3 // Особенный
    if (rnd < 0.2) return 2 // Стандартный
    return 1 // Обычный
  }
}

module.exports = InventoryService
