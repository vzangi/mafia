const BaseService = require('./BaseService')
const Chat = require('../../models/Chat')
const typingUsers = []

class ChatService extends BaseService {
    // Список последних сообщений
    async lastMessages() {
        const messages = await Chat.scope('def').findAll()
        return messages
    }

    // Пришло сообщение
    async message(message) {
        const { user, io } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        // Сохраняю сообщение в базу
        const msg = await Chat.newMessage(user.id, message)

        // Рассылаю сообщение всем подключенным пользователям
        io.of('/lobbi').emit('chat.message', msg)
    }

    // Пользователь начал что-то печатать в чате
    typingBegin() {
        const { io, socket } = this
        if (!socket.account) {
            throw new Error('Не авторизован')
        }
        const { username } = socket.account

        if (typingUsers[username]) {
            clearTimeout(typingUsers[username])
        }

        typingUsers[username] = setTimeout(() => {
            this._cancelTyping()
        }, 3000)

        io.of('/lobbi').emit('chat.typing.begin', Object.keys(typingUsers))
    }

    // Пользователь перестал печатать
    typingEnd() {
        const { socket } = this
        if (!socket.account) {
            throw new Error('Не авторизован')
        }
        const { username } = socket.account

        if (typingUsers[username]) {
            clearTimeout(typingUsers[username])
        }

        this._cancelTyping()
    }

    // Процедура завершения печати
    _cancelTyping() {
        const { io, socket } = this
        if (!socket.account) {
            throw new Error('Не авторизован')
        }
        const { username } = socket.account

        if (typingUsers[username]) {
            delete typingUsers[username]
        }
        io.of('/lobbi').emit('chat.typing.end', Object.keys(typingUsers))
    }
}

module.exports = ChatService