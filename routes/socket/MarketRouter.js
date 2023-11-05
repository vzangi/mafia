module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/MarketController')(
    io,
    socket
  )

  // Покупка лота
  socket.on('market.buy', controller.buy.bind(controller))
}
