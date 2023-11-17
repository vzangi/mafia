const AccountThing = require('../models/AccountThing')
const Thing = require('../models/Thing')
const ThingType = require('../models/ThingType')
const ThingClass = require('../models/ThingClass')
const ThingCollection = require('../models/ThingCollection')
const NaborThing = require('../models/NaborThing')
const { Op } = require('sequelize')

class MarketService {
  // Список вещей на продажу
  async marketData() {
    const types = await ThingType.findAll({ order: [['sort']] })
    const classes = await ThingClass.findAll({ order: [['sort']] })
    const collections = await ThingCollection.findAll({ order: [['sort']] })

    const things = await AccountThing.getMarketList()

    const data = {
      types,
      classes,
      collections,
      things,
      title: 'Маркет онлайн игры Mafia One',
      description: 'Покупайте и продавайте вещи из своего арсенала',
    }
    return data
  }

  // Лоты игрока
  async myLotsData(account) {
    if (!account) {
      throw new Error('Не авторизован')
    }
    const things = await AccountThing.findAll({
      where: {
        accountId: account.id,
        marketPrice: {
          [Op.ne]: null,
        },
      },
      include: [
        {
          model: Thing,
          include: [
            { model: ThingClass },
            { model: ThingCollection },
            { model: ThingType },
          ],
        },
      ],
    })

    const data = {
      things,
      title: `Мои лоты на маркете Mafia One`,
    }

    return data
  }

  // Предложения по вещи
  async thingData(thingId) {
    if (!thingId) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await Thing.findByPk(thingId, {
      include: [
        {
          model: ThingClass,
        },
        {
          model: ThingType,
        },
        {
          model: ThingCollection,
        },
      ],
    })

    if (!thing) {
      throw new Error('Вещь не найдена')
    }

    const thingOffers = await AccountThing.getThingList(thingId)

    const data = {
      thing,
      thingOffers,
      title: thing.name + ' - покупайте в маркете игры Mafia One',
      description: thing.description,
    }

    // Если вещь является набором или кейсом - подгружаю вещи входящие в него
    if (thing.thingtypeId == 3 || thing.thingtypeId == 4) {
      data.items = await NaborThing.findAll({
        where: {
          naborId: thing.id,
        },
        include: [{ model: Thing }],
        order: [['thing', 'thingclassId']],
      })
    }

    return data
  }
}

module.exports = new MarketService()
