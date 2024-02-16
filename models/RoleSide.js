const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')

const RoleSide = sequelize.define(
  'rolesides',
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
    picture: {
      type: DataTypes.STRING,
    },
  },
  {
    timestamps: false,
  }
)

module.exports = RoleSide
