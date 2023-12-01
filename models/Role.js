const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')

const Role = sequelize.define(
  'roles',
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
    rolesideId: {
      type: DataTypes.INTEGER,
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

module.exports = Role
