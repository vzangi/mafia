const Chat = require('../../models/Chat')
const BaseSocketController = require('./BaseSocketController')
const typingUsers = []

class ChatController extends BaseSocketController {
  // Процедура завершения печати
  _cancelTyping() {
    const { user, io } = this
    if (typingUsers[user.username]) {
      delete typingUsers[user.username]
    }
    io.emit('chat.typing.end', Object.keys(typingUsers))
  }

  // Список последних сообщений
  lastMessages(callback) {
    Chat.scope('def')
      .findAll()
      .then((msgs) => callback(msgs))
  }

  // Пришло сообщение
  message(message) {
    const { user, io } = this
    // Отсеиваю попытки отправки сообщений
    // неавторизованными пользователями (хакер детектед)
    if (!user) return

    if (message.length > 255) {
      message = message.substr(0, 255)
    }

    // Сохраняю сообщение в базу
    Chat.newMessage(user.id, message).then((msg) => {
      // Рассылаю сообщение всем подключенным пользователям
      io.emit('chat.message', msg)
    })
  }

  // Пользователь начал что-то печатать в чате
  typingBegin() {
    const { user, io } = this
    if (!user) return

    if (typingUsers[user.username]) clearTimeout(typingUsers[user.username])

    typingUsers[user.username] = setTimeout(() => {
      this._cancelTyping()
    }, 3000)

    io.emit('chat.typing.begin', Object.keys(typingUsers))
  }

  // Пользователь перестал печатать
  typingEnd() {
    const { user } = this
    if (!user) return

    if (typingUsers[user.username]) clearTimeout(typingUsers[user.username])

    this._cancelTyping()
  }
}

module.exports = (io, socket) => {
  return new ChatController(io, socket)
}
