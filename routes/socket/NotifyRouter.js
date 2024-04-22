module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/NotifyController')(
    io,
    socket
  )

  // Пометить нотификацию прочитанной
  socket.on('notify.read', controller.read.bind(controller))

  // Получение списка непрочитанных нотификаций
  socket.on('notify.list', controller.getNewNotifies.bind(controller))

  // Отправка нотификации пользователю
  socket.on('notification.send', controller.sendNotify.bind(controller))
}
