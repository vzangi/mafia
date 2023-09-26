const { Op } = require('sequelize')
const BaseSocketController = require('./BaseSocketController')
const Message = require('../../models/Message')
const Friend = require('../../models/Friend')
const Account = require('../../models/Account')
const sequelize = require('../../units/db')
const limit = 10

class MessagesController extends BaseSocketController {
  // Проверка на дружеские отношения
  async isFriend(friendId, callback) {
    const { user } = this
    if (!user) return callback({ status: 2, msg: 'Неавторизованный запрос' })

    const relations = await Friend.findOne({
      where: {
        accountId: user.id,
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

    if (!relations)
      return callback({
        status: 1,
        msg: 'Вы не можете писать приватные сообщения этому игроку',
      })

    callback({ status: 0, friend: relations.friend })
  }

  // Получение последних сообщений
  async getMessages(friendId, offset, callback) {
    const { user } = this
    if (!user) return callback({ status: 2, msg: 'Неавторизованный запрос' })

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          {
            [Op.and]: [{ accountId: user.id }, { friendId }],
          },
          {
            [Op.and]: [{ accountId: friendId }, { friendId: user.id }],
          },
        ],
      },
      offset,
      limit,
    })

    callback({ status: 0, messages })
  }

  async getList(callback) {
    const { user } = this
    if (!user) return callback({ status: 2, msg: 'Неавторизованный запрос' })

    const [results, _] = await sequelize.query(`
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
        (m1.accountId = ${user.id} OR m1.friendId = ${user.id});`)

    const lastMsgs = await Message.findAll({
      where: {
        id: results.map((r) => r.id),
      },
      // raw: true,
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

    callback({ status: 0, lastMsgs, userId: user.id })
  }
}

module.exports = (io, socket) => {
  return new MessagesController(io, socket)
}
