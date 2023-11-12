module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/TradesController')(
    io,
    socket
  )

  // Новый обмен
  socket.on('trades.new', controller.newTrade.bind(controller))

  // Новый обмен
  socket.on('trades.decline', controller.decline.bind(controller))
}
