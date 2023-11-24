const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')

// id классов вещей
const thingClasses = {
  SIMPLE: 1,
  STANDART: 2,
  SPECIAL: 3,
  HIGHER: 4,
  EXSCLUSIVE: 5,
}

const ThingClass = sequelize.define('thingclasses', {
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

ThingClass.thingClasses = thingClasses

module.exports = ThingClass
