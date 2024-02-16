const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const RoleSide = require('./RoleSide')

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
    description: {
      type: DataTypes.TEXT,
    },
  },
  {
    timestamps: false,
  }
)

Role.roles = roles

Role.belongsTo(RoleSide)

module.exports = Role
