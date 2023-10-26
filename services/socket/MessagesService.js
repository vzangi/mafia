const BaseService = require('./BaseService')
const Message = require('../../models/Message')
const htmlspecialchars = require('htmlspecialchars')
const typingUsers = []

class MessagesService extends BaseService {
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
        if (!user) {
            throw new Error('Не авторизован')
        }

        // Если в списке печатающих пользователей есть текущий пользователь
        // Отключаю таймаут сброса печати
        if (typingUsers[user.username]) {
            clearTimeout(typingUsers[user.username])
        }

        // Завершаю печать
        this._cancelTyping()

        // Отправляю нотификацию о завершении печати
        const friendIds = this.getUserSocketIds(friendId)
        friendIds.forEach((sid) => {
            socket.broadcast.to(sid).emit('messages.typing.end', user.id)
        })
    }

    // Пользователь начал печатать в приватном чате
    typingBegin(friendId) {
        const { user, socket } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        // Если в списке печатающих пользователей есть текущий пользователь
        // Отключаю таймаут сброса печати
        if (typingUsers[user.username]) {
            clearTimeout(typingUsers[user.username])
        }

        // Выставляю новый таймаут сброса печати
        typingUsers[user.username] = setTimeout(() => {
            this._cancelTyping()
        }, 3000)

        // Отправляю нотификацию о начале печати
        const friendIds = this.getUserSocketIds(friendId)
        friendIds.forEach((sid) => {
            socket.broadcast.to(sid).emit('messages.typing', user.id)
        })
    }

    // Проверка на дружеские отношения
    async isFriend(friendId) {
        const { user } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        const relations = await Message.canMassaging(user.id, friendId)

        if (!relations) {
            throw new Error('Вы не можете писать приватные сообщения этому игроку')
        }

        return relations.friend
    }

    // Получение последних сообщений
    async getMessages(friendId, offset) {
        const { user } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        const messages = await Message.getPrivateMessages(user.id, friendId, offset)

        return messages
    }

    // Получение списка друзей с которыми есть приватный чат
    async getList() {
        const { user } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        const lastMsgs = await Message.lastMessages(user.id)
        return lastMsgs
    }

    // Отправка сообщения
    async sendMessage(friendId, message) {
        const { user, socket } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        if (!message || !friendId) {
            throw new Error('Нет необходимых данных')
        }

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

        return msg
    }

    // Пометить сообщения прочтёнными
    async readMessages(friendId) {
        const { user, socket } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        // Ставлю метку прочитанности сообщений
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

        // Оповещаю о том, что сообщения прочитаны
        const friendIds = this.getUserSocketIds(friendId)
        friendIds.forEach((sid) => {
            socket.broadcast.to(sid).emit('messages.isreaded', user.id)
        })
    }
}

module.exports = MessagesService