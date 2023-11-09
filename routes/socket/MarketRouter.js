module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/MarketController')(
    io,
    socket
  )

  // Покупка лота
  socket.on('market.buy', controller.buy.bind(controller))

  // Продажа вещи
  socket.on('market.sell', controller.sell.bind(controller))

  // Выставить вещь на маркет
  socket.on('market.sell.on', controller.sellOnMarket.bind(controller))

  // Вернуть лот в инвентарь
  socket.on('market.takeback', controller.takeBack.bind(controller))
}
