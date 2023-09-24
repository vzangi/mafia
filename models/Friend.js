const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

const friendshipStatuses = {
  BLOCK: -2,
  DECLINE: -1,
  REQUESTED: 0,
  ACCEPTED: 1,
  MARRIED_REQUEST: 2,
  MARRIED: 3,
}

const Friend = sequelize.define(
  'friends',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    friendId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    scopes: {
      def: {
        include: [
          {
            model: Account,
            as: 'friend',
          },
        ],
      },
      // Запросы на дружбу/партнёрство
      requests(friendId) {
        return {
          where: {
            friendId,
            [Op.or]: [
              { status: friendshipStatuses.REQUESTED },
              { status: friendshipStatuses.MARRIED_REQUEST },
            ],
          },
          include: {
            model: Account,
            as: 'account',
          },
        }
      },
      // Друзья
      friends(accountId) {
        return {
          where: {
            accountId,
            [Op.or]: [
              { status: friendshipStatuses.ACCEPTED },
              { status: friendshipStatuses.MARRIED },
            ],
          },
          include: {
            model: Account,
            as: 'friend',
          },
        }
      },
      // Супруг(а)
      partner(accountId) {
        return {
          where: {
            accountId,
            status: friendshipStatuses.MARRIED,
          },
          include: {
            model: Account,
            as: 'friend',
          },
        }
      }
    },
  }
)

Friend.belongsTo(Account, { as: 'account', foreignKey: 'accountId' })
Friend.belongsTo(Account, { as: 'friend', foreignKey: 'friendId' })

Friend.statuses = friendshipStatuses

Friend.requestsCount = async (friendId) => {
  return await Friend.scope({ method: ['requests', friendId] }).count()
}

Friend.correctForm = (friendsCount) => {
  if (friendsCount == 1) return 'Друг'
  if (friendsCount < 5) return 'Друга'
  if (friendsCount < 20) return 'Друзей'

  if (friendsCount % 10 == 1) return 'Друг'
  if (friendsCount % 10 == 2) return 'Друга'
  if (friendsCount % 10 == 3) return 'Друга'
  if (friendsCount % 10 == 4) return 'Друга'

  return 'Друзей'
}

module.exports = Friend
