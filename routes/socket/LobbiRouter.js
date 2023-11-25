module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/LobbiController')(
    io,
    socket
  )

  // Создание игры
  socket.on('game.make', controller.makeGame.bind(controller))
}
