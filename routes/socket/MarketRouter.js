module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/MarketController')(
    io,
    socket
  )

  // Покупка лота
  socket.on('market.buy', controller.buy.bind(controller))

  // Покупка лота в системе
  socket.on('market.buy.system', controller.buyFromSystem.bind(controller))

  // Продажа вещи
  socket.on('market.sell', controller.sell.bind(controller))

  // Выставить вещь на маркет
  socket.on('market.sell.on', controller.sellOnMarket.bind(controller))

  // Вернуть лот в инвентарь
  socket.on('market.takeback', controller.takeBack.bind(controller))

  // Возвращает отфильтрованный список офферов из маркета
  socket.on('market.list', controller.getList.bind(controller))

  // Получение минимальной цены вещи на маркете
  socket.on('market.minprice', controller.getMinPrice.bind(controller))

  // Получение минимальной цены вещи на маркете
  socket.on('market.buy.vip', controller.buyVip.bind(controller))
}
