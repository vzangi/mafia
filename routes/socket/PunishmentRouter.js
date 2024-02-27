module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/PunishmentController')(
    io,
    socket
  )

  // Снятие запрета
  socket.on('punishment.remove', controller.removePunish.bind(controller))

  // Создание запрета
  socket.on('punishment.make', controller.makePunish.bind(controller))
}
