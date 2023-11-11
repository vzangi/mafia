module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/TradesController')(
    io,
    socket
  )

  // Новый обмен
  socket.on('trades.new', controller.newTrade.bind(controller))
}
