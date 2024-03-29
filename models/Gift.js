const { DataTypes, Op } = require('sequelize')
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
      items(giftgroupId, lastDate) {
        const res = {
          limit,
          order: [['updatedAt', 'DESC']],
          include: [
            {
              model: GiftGroup,
              where: {
                active: true,
              },
            },
          ],
        }
        if (giftgroupId) {
          res.where = {
            giftgroupId,
          }
        }
        if (lastDate) {
          if (!res.where) {
            res.where = {}
          }
          res.where.updatedAt = {
            [Op.lt]: lastDate,
          }
        }
        return res
      },
    },
  }
)

Gift.belongsTo(GiftGroup)

module.exports = Gift
