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
}

module.exports = BaseService