const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')

// id типов вещей
const thingTypes = {
  THING: 1,
  VIP: 2,
  KIT: 3,
  KEIS: 4,
  KEY: 5,
  BADGE: 6,
  BAG: 7,
}

const ThingType = sequelize.define('thingtypes', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  sort: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
})

ThingType.thingTypes = thingTypes

module.exports = ThingType
