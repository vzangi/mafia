const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')

const roles = {
  CITIZEN: 1,
  MAFIA: 2,
  KOMISSAR: 3,
  SERGEANT: 4,
  DOCTOR: 5,
  MANIAC: 6,
  CHILD: 7,
  ADVOCATE: 8,
  WHORE: 9,
}

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

Role.roles = roles

module.exports = Role
