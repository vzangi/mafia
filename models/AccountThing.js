const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const Thing = require('./Thing')

const AccountThing = sequelize.define('accountthings', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  thingId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  marketPrice: {
    type: DataTypes.INTEGER,
  },
}, {
  scopes: {
    withThings(profileId) {
      return {
        where: {
          accountId: profileId,
          marketPrice: null
        },
        include: [
          {
            model: Thing
          }
        ]
      }
    }
  }
})

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
    LIMIT 0, 10
  `)
  return things
}

module.exports = AccountThing
