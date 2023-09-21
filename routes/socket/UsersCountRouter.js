module.exports = (io, socket) => {
    const controller = require('../../controllers/socket/UsersCountController')(io, socket)

    // Процедура при подключении сокета
    controller.connect.bind(controller)()

    // Количество подключенных пользователей
    socket.on("online.count", controller.count.bind(controller))

    // Событие при закрытии сокета
    socket.on('disconnect', controller.disconnect.bind(controller))
}