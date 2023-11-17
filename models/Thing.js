const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const ThingType = require('./ThingType')
const ThingClass = require('./ThingClass')
const ThingCollection = require('./ThingCollection')
const NaborThing = require('./NaborThing')

const Thing = sequelize.define('things', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  picture: {
    type: DataTypes.STRING,
  },
  price: {
    type: DataTypes.FLOAT,
  },
  forsale: {
    type: DataTypes.BOOLEAN,
  },
  thingtypeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  thingclassId: {
    type: DataTypes.INTEGER,
  },
  thingcollectionId: {
    type: DataTypes.INTEGER,
  },
})

Thing.belongsTo(ThingType)
Thing.belongsTo(ThingClass)
Thing.belongsTo(ThingCollection)

Thing.hasMany(NaborThing, { foreignKey: 'naborId' })
NaborThing.belongsTo(Thing)

module.exports = Thing
