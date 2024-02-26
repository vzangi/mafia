const { DataTypes, Sequelize } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const ChatUsers = require('./ChatUsers')
const htmlspecialchars = require('htmlspecialchars')
const lastMessagesLimit = 100

const Chat = sequelize.define(
  'chat',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
    },
    username: {
      type: DataTypes.STRING,
    },
    message: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    scopes: {
      def: {
        limit: lastMessagesLimit,
        order: [['createdAt', 'desc']],
        attributes: ['message', 'username', 'createdAt'],
        include: [
          {
            model: ChatUsers,
            attributes: ['id'],
            include: {
              model: Account,
              attributes: ['id', 'username', 'vipTo', 'vip'],
            },
          },
          {
            model: Account,
            attributes: ['id', 'vipTo', 'vip'],
          },
        ],
      },
    },
  }
)

Chat.belongsTo(Account)
Chat.hasMany(ChatUsers)

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
    accounts.push({ accountId: account.id })
  }
  return accounts
}

// Сохраняет новое сообщение в базе и возвращает его
Chat.newMessage = async (accountId, msg) => {
  let message = htmlspecialchars(msg)
  if (message.length > 255) {
    message = message.substr(0, 255)
  }
  const chatusers = await getUsersInMessage(msg)
  const account = await Account.findByPk(accountId)
  const { username } = account
  const newMsg = await Chat.create(
    {
      accountId,
      username,
      message,
      chatusers,
    },
    {
      include: ChatUsers,
    }
  )
  return await Chat.scope('def').findOne({ where: { id: newMsg.id } })
}

Chat.sysMessage = async (msg) => {
  let message = htmlspecialchars(msg)
  if (message.length > 255) {
    message = message.substr(0, 255)
  }
  const chatusers = await getUsersInMessage(msg)
  const newMsg = await Chat.create(
    {
      accountId: 1,
      username: '',
      message,
      chatusers,
    },
    {
      include: ChatUsers,
    }
  )
  return await Chat.scope('def').findOne({ where: { id: newMsg.id } })
}

module.exports = Chat
