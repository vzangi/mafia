const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const Thing = require('./Thing')

const AccountThing = sequelize.define(
  'accountthings',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    accountId: {
      type: DataTypes.INTEGER,
    },
    thingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    marketPrice: {
      type: DataTypes.INTEGER,
    },
    taked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    scopes: {
      withThings(profileId) {
        return {
          where: {
            accountId: profileId,
            marketPrice: null,
          },
          include: [
            {
              model: Thing,
            },
          ],
        }
      },
    },
  }
)

AccountThing.belongsTo(Account)
AccountThing.belongsTo(Thing)

AccountThing.getMarketList = async () => {
  const [things, _] = await sequelize.query(`
    SELECT 
      t.name, 
      t.picture, 
      a_things.thingId,
      t_class.id AS tc_id, 
      t_class.name AS tc_name, 
      min(a_things.marketPrice) AS min_price,
      count(*) AS cnt
    FROM accountthings AS a_things
    JOIN things AS t ON t.id = a_things.thingId
    JOIN thingclasses as t_class ON t_class.id = t.thingclassId
    WHERE a_things.marketPrice IS NOT NULL
    GROUP BY a_things.thingId 
  `)
  return things
}

AccountThing.getList = async (types, classes, collections) => {
  let where = 'AND 1 = 1'
  if (types.length > 0) {
    where = `${where} AND t.thingtypeId in (${types.join(',')})`
  }
  if (classes.length > 0) {
    where = `${where} AND t.thingclassId in (${classes.join(',')})`
  }
  if (collections.length > 0) {
    where = `${where} AND t.thingcollectionId in (${collections.join(',')})`
  }

  const [things, _] = await sequelize.query(`
    SELECT 
      t.name, 
      t.picture, 
      a_things.thingId,
      t_class.id AS tc_id, 
      t_class.name AS tc_name, 
      min(a_things.marketPrice) AS min_price,
      count(*) AS cnt
    FROM accountthings AS a_things
    JOIN things AS t ON t.id = a_things.thingId
    JOIN thingclasses as t_class ON t_class.id = t.thingclassId
    WHERE a_things.marketPrice IS NOT NULL
    ${where}
    GROUP BY a_things.thingId 
  `)
  return things
}

AccountThing.getThingList = async (thingId) => {
  const offers = await AccountThing.findAll({
    where: {
      marketPrice: {
        [Op.ne]: null,
      },
      thingId,
    },
    include: [
      {
        model: Account,
      },
    ],
    order: [['marketPrice', 'ASC']],
  })
  return offers
}

// Суммарная сила игрока в перестрелке
AccountThing.getPower = async (playerId) => {
  // Загружаю вещи, которые игрок взял в игру
  const takedThings = await AccountThing.findAll({
    where: {
      accountId: playerId,
      taked: true,
    },
    include: [
      {
        model: Thing,
        where: {
          thingtypeId: 1, // Вещи
        },
      },
    ],
    limit: 5,
  })

  // Рассчитываю силу урона игрока
  let power = 0
  for (const thingIndex in takedThings) {
    const { thing } = takedThings[thingIndex]
    if (thing.thingclassId == 5) {
      power += 20
      continue
    }
    power += thing.thingclassId * 5
  }

  return power
}

module.exports = AccountThing
