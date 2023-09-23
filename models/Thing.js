const { DataTypes } = require("sequelize")
const sequelize = require('../units/db')

const Thing = sequelize.define(
    'things',
    {
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
    }
)


module.exports = Thing