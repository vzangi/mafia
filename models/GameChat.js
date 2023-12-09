const { DataTypes, Sequelize } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const GameChatUsers = require('./GameChatUsers')
const htmlspecialchars = require('htmlspecialchars')

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
  console.log(message)
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
GameChat.newMessage = async (gameId, accountId, msg) => {
  let message = htmlspecialchars(msg)
  if (message.length > 255) {
    message = message.substr(0, 255)
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
      gamechatusers,
    },
    {
      include: GameChatUsers,
    }
  )
  return await GameChat.findOne({ where: { id: newMsg.id } })
}

module.exports = GameChat
