const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')

const ThingCollection = sequelize.define('thingcollections', {
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

module.exports = ThingCollection
