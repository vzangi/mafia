const { DataTypes, Sequelize, Op } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const GameChatUsers = require('./GameChatUsers')
const htmlspecialchars = require('htmlspecialchars')
const floodTimeLimit = 10

const GameChat = sequelize.define('gamechats', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  gameId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  accountId: {
    type: DataTypes.INTEGER,
  },
  username: {
    type: DataTypes.STRING,
  },
  message: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  private: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
})

GameChat.belongsTo(Account)
GameChat.hasMany(GameChatUsers)

// Получение массива пользователей из присланного сообщения
const getUsersInMessage = async (message) => {
  const accounts = []
  const matchUsers = [...message.matchAll(/\[([^\]]*)\]/g)] // [username]
  for (let index = 0; index < matchUsers.length; index++) {
    const userNik = matchUsers[index][1]
    const account = await Account.findOne({
      where: { username: userNik },
      attributes: ['id'],
    })
    if (!account) continue
    if (accounts.filter((a) => a.accountId == account.id).length == 0)
      accounts.push({ accountId: account.id })
  }
  return accounts
}

// Сохраняет новое сообщение в базе и возвращает его
GameChat.newMessage = async (
  gameId,
  accountId,
  msg,
  isPrivate = false,
  chars = true
) => {
  let message = msg
  if (chars) message = htmlspecialchars(msg)
  if (message.length > 255) {
    message = message.substr(0, 255)
  }

  if (accountId) {
    // проверяю является ли сообщение флудом
    const isFlood = await GameChat.findAll({
      where: {
        message,
        accountId,
        createdAt: {
          [Op.gt]: new Date(Date.now() - floodTimeLimit * 1000).toISOString(),
        },
      },
      order: [['id', 'desc']],
    })

    if (isFlood.length >= 2) {
      throw new Error('flood')
    }

    const messagesCount = await GameChat.count({
      where: {
        accountId,
        createdAt: {
          [Op.gt]: new Date(Date.now() - floodTimeLimit * 1000).toISOString(),
        },
      },
    })

    if (messagesCount > 9) {
      throw new Error('flood')
    }
  }

  const gamechatusers = await getUsersInMessage(message)
  let username = ''
  if (accountId) {
    const account = await Account.findByPk(accountId)
    username = account.username
  }
  const newMsg = await GameChat.create(
    {
      gameId,
      accountId,
      username,
      message,
      private: isPrivate,
      gamechatusers,
    },
    {
      include: GameChatUsers,
    }
  )
  return await GameChat.findOne({
    where: {
      id: newMsg.id,
    },
    attributes: ['message', 'private', 'createdAt', 'username'],
    include: [
      {
        model: GameChatUsers,
        include: [
          {
            model: Account,
            attributes: ['username'],
          },
        ],
        attributes: ['accountId'],
      },
    ],
  })
}

module.exports = GameChat
