const BaseSocketController = require('./BaseSocketController')
const Message = require('../../models/Message')
const htmlspecialchars = require('htmlspecialchars')
const typingUsers = []

class MessagesController extends BaseSocketController {
  // Процедура завершения печати
  _cancelTyping() {
    const { user } = this
    if (typingUsers[user.username]) {
      delete typingUsers[user.username]
    }
  }

  // Пользователь перестал печатать
  typingEnd(friendId) {
    const { user, socket } = this
    if (!user) return

    if (typingUsers[user.username]) clearTimeout(typingUsers[user.username])

    this._cancelTyping()

    const friendIds = this.getUserSocketIds(friendId)
    friendIds.forEach((sid) => {
      socket.broadcast.to(sid).emit('messages.typing.end', user.id)
    })
  }

  // Пользователь начал что-то печатать в чате
  typingBegin(friendId) {
    const { user, socket } = this
    if (!user) return

    if (typingUsers[user.username]) clearTimeout(typingUsers[user.username])

    typingUsers[user.username] = setTimeout(() => {
      this._cancelTyping()
    }, 3000)

    const friendIds = this.getUserSocketIds(friendId)
    friendIds.forEach((sid) => {
      socket.broadcast.to(sid).emit('messages.typing', user.id)
    })
  }

  // Проверка на дружеские отношения
  async isFriend(friendId, callback) {
    const { user } = this
    if (!user) return callback({ status: 2, msg: 'Неавторизованный запрос' })

    const relations = await Message.canMassaging(user.id, friendId)

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

    const messages = await Message.getPrivateMessages(user.id, friendId, offset)

    callback({ status: 0, messages })
  }

  // Получение списка друзей с которыми есть приватный чат
  async getList(callback) {
    const { user } = this
    if (!user) return callback({ status: 2, msg: 'Неавторизованный запрос' })

    const lastMsgs = await Message.lastMessages(user.id)

    callback({ status: 0, lastMsgs, userId: user.id })
  }

  // Отправка сообщения
  async sendMessage(friendId, message, callback) {
    const { user, socket } = this
    // Отсеиваю попытки отправки сообщений
    // неавторизованными пользователями (хакер детектед)
    if (!user || !friendId) callback(1, 'Нет необходимых данных')

    message = htmlspecialchars(message.substr(0, 255))

    if (message.length > 255) {
      message = message.substr(0, 255)
    }

    const msg = await Message.create({
      accountId: user.id,
      friendId,
      message,
    })

    const friendIds = this.getUserSocketIds(friendId)
    friendIds.forEach((sid) => {
      socket.broadcast.to(sid).emit('messages.new', msg)
    })

    callback(0, msg)
  }

  async readMessages(friendId, callback) {
    const { user, socket } = this

    await Message.update(
      {
        isRead: 1,
      },
      {
        where: {
          accountId: friendId,
          friendId: user.id,
          isRead: 0,
        },
      }
    )

    const friendIds = this.getUserSocketIds(friendId)
    friendIds.forEach((sid) => {
      socket.broadcast.to(sid).emit('messages.isreaded', user.id)
    })

    if (callback) callback()
  }
}

module.exports = (io, socket) => {
  return new MessagesController(io, socket)
}
