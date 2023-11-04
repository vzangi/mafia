const AccountThing = require('../models/AccountThing')
const Thing = require('../models/Thing')
const ThingType = require('../models/ThingType')
const ThingClass = require('../models/ThingClass')
const ThingCollection = require('../models/ThingCollection')

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
          model: ThingClass
        },
        {
          model: ThingType
        },
        {
          model: ThingCollection
        }
      ]
    })

    if (!thing) {
      throw new Error('Вещь не найдена')
    }

    const thingOffers = await AccountThing.getThingList(thingId)

    const data = {
      thing,
      thingOffers,
    }

    return data
  }
}

module.exports = new MarketService()
