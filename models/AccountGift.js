const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const Gift = require('./Gift')
const { getCoolDateTime } = require('../units/helpers')
const giftLimit = 9

const AccountGifts = sequelize.define(
  'accountgifts',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    giftId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fromId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    giftDate: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return getCoolDateTime(this.createdAt)
      },
      set() {
        throw new Error('Do not try to set this value!')
      },
    },
  },
  {
    scopes: {
      withModels(profileId, maxId = 0) {
        const where = { accountId: profileId }
        if (maxId != 0) {
          where.id = {
            [Op.lt]: maxId,
          }
        }
        return {
          where,
          order: [['id', 'desc']],
          limit: giftLimit,
          include: [
            {
              model: Account,
              as: 'from',
              attributes: ['id', 'username'],
            },
            {
              model: Gift,
            },
          ],
        }
      },
    },
  }
)

AccountGifts.belongsTo(Account, { as: 'account', foreignKey: 'accountId' })
AccountGifts.belongsTo(Account, { as: 'from', foreignKey: 'fromId' })
AccountGifts.belongsTo(Gift)

module.exports = AccountGifts
