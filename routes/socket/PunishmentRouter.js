module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/PunishmentController')(
    io,
    socket
  )

  // Удаление запрета
  socket.on('punishment.remove', controller.removePunish.bind(controller))
}
