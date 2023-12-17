const Notification = require('../../models/Notification')

class BaseService {
    constructor(io, socket) {
        this.io = io
        this.socket = socket
        this.user = socket.user
    }

    // Получение id сокетов конкретного пользователя
    getUserSocketIds(userId) {
        const { socket } = this
        const ids = []
        try {
            // Проходимся по всем сокетам
            for (const [sid, s] of socket.server.of('/').sockets) {
                // Если в сокете нет пользователя (он гость), то пропускаем его
                if (!s.user) continue
                // Если в каком-то из сокетов найден нужный игрок
                if (s.user.id == userId) {
                    ids.push(sid)
                }
            }
        } catch (error) {
            console.log(error)
        }
        return ids
    }

    // Получение сокетов конкретного пользователя
    getUserSockets(userId, nsp = '/') {
        const { socket } = this
        const ids = []
        try {
            // Проходимся по всем сокетам
            for (const [sid, s] of socket.server.of(nsp).sockets) {
                // Если в сокете нет пользователя (он гость), то пропускаем его
                if (!s.user) continue
                // Если в каком-то из сокетов найден нужный игрок
                if (s.user.id == userId) {
                    ids.push(s)
                }
            }
        } catch (error) {
            console.log(error)
        }
        return ids
    }

    // Новая нотификация
    async notify(accountId, message, level = 0) {
        const { socket } = this
        const newNotify = await Notification.create({ accountId, message, level })

        // Отправка нотификации на открытые сокеты игрока 
        const ids = this.getUserSocketIds(accountId)
        ids.forEach((sid) => {
            socket.broadcast.to(sid).emit('notify', {
                id: newNotify.id,
                message: newNotify.message,
                level: newNotify.level
            })
        })
    }
}

module.exports = BaseService