const AccountThing = require('../models/AccountThing')
const ThingType = require('../models/ThingType')
const ThingClass = require('../models/ThingClass')
const ThingCollection = require('../models/ThingCollection')

class MarketService {
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
}

module.exports = new MarketService()
