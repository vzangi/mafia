const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const ThingType = require('./ThingType')
const ThingClass = require('./ThingClass')
const ThingCollection = require('./ThingCollection')

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
    allowNull: false,
  },
  thingcollectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
})

Thing.belongsTo(ThingType)
Thing.belongsTo(ThingClass)
Thing.belongsTo(ThingCollection)

module.exports = Thing
