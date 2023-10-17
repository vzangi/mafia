const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const GiftGroup = require('./GiftGroup')
const limit = 24

const Gift = sequelize.define(
  'gifts',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    giftgroupId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    picture: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isVip: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
  },
  {
    scopes: {
      items(giftgroupId, lastId) {
        const res = {
          limit,
          order: [['updatedAt', 'DESC']],
        }
        if (giftgroupId) {
          res.where = {
            giftgroupId,
          }
        }
        return res
      },
    },
  }
)

Gift.belongsTo(GiftGroup)

module.exports = Gift
