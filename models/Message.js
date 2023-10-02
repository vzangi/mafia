const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const Friend = require('./Friend')
const limit = 20

const Message = sequelize.define('messages', {
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
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: 0,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
})

Message.belongsTo(Account, { as: 'account', foreignKey: 'accountId' })
Message.belongsTo(Account, { as: 'friend', foreignKey: 'friendId' })

Message.lastMessages = async (userId) => {
  const [results, _] = await sequelize.query(`
    SELECT m0.id, m0.accountId, m0.friendId, m0.message
    FROM messages as m0
    JOIN friends AS fr 
      ON (fr.accountId = m0.accountId and fr.friendId = m0.friendId) and 
          (fr.status = ${Friend.statuses.ACCEPTED} OR fr.status = ${Friend.statuses.MARRIED})
    WHERE m0.id in (
    SELECT m1.id
    FROM messages as m1
    where 
      m1.id = (SELECT max(m2.id) FROM messages as m2 
          WHERE 
            (m2.accountId = m1.accountId and m2.friendId = m1.friendId)
                    or
                    (m2.accountId = m1.friendId and m2.friendId = m1.accountId)
                )
      and
      (m1.accountId = ${userId} OR m1.friendId = ${userId}))`)

  return await Message.findAll({
    where: {
      id: results.map((r) => r.id),
    },
    attributes: ['id', 'friendId', 'accountId', 'message'],
    order: [['id', 'DESC']],
    include: [
      {
        model: Account,
        as: 'friend',
        attributes: ['id', 'avatar', 'vipTo', 'vip', 'online', 'username'],
      },
      {
        model: Account,
        as: 'account',
        attributes: ['id', 'avatar', 'vipTo', 'vip', 'online', 'username'],
      },
    ],
  })
}

Message.canMassaging = async (accountId, friendId) => {
  return await Friend.findOne({
    where: {
      accountId,
      friendId,
      [Op.or]: [
        { status: Friend.statuses.MARRIED },
        { status: Friend.statuses.ACCEPTED },
      ],
    },
    include: {
      model: Account,
      as: 'friend',
      attributes: ['id', 'avatar', 'vipTo', 'vip', 'online', 'username'],
    },
  })
}

Message.getPrivateMessages = async (accountId, friendId, offset) => {
  let where = {
    [Op.or]: [
      {
        [Op.and]: [{ accountId }, { friendId }],
      },
      {
        [Op.and]: [{ accountId: friendId }, { friendId: accountId }],
      },
    ],
  }
  if (offset != 0) {
    where = {
      [Op.or]: [
        {
          [Op.and]: [{ accountId }, { friendId }],
        },
        {
          [Op.and]: [{ accountId: friendId }, { friendId: accountId }],
        },
      ],
      id: {
        [Op.lt]: offset,
      },
    }
  }
  return await Message.findAll({
    where,
    limit,
    order: [['id', 'DESC']],
  })
}

module.exports = Message
