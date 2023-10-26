const BaseService = require('./BaseService')
const Chat = require('../../models/Chat')
const typingUsers = []

class ChatService extends BaseService {
    // Процедура завершения печати
    _cancelTyping() {
        const { user, io } = this
        if (typingUsers[user.username]) {
            delete typingUsers[user.username]
        }
        io.of('/lobbi').emit('chat.typing.end', Object.keys(typingUsers))
    }

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
        const { user, io } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        if (typingUsers[user.username]) {
            clearTimeout(typingUsers[user.username])
        }

        typingUsers[user.username] = setTimeout(() => {
            this._cancelTyping()
        }, 3000)

        io.of('/lobbi').emit('chat.typing.begin', Object.keys(typingUsers))
    }

    // Пользователь перестал печатать
    typingEnd() {
        const { user } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        if (typingUsers[user.username]) {
            clearTimeout(typingUsers[user.username])
        }

        this._cancelTyping()
    }
}

module.exports = ChatService