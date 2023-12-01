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
  },
  {
    timestamps: false,
  }
)

module.exports = RoleSide
