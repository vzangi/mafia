module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/TradesController')(
    io,
    socket
  )

  // Новый обмен
  socket.on('trades.new', controller.newTrade.bind(controller))

  // Отмена обмена
  socket.on('trades.decline', controller.decline.bind(controller))

  // Принятие обмена
  socket.on('trades.accept', controller.accept.bind(controller))

  // Принятие обмена
  socket.on('trades.history', controller.history.bind(controller))

  // Отправленные предложения
  socket.on('trades.sended', controller.sended.bind(controller))

  // Отзыв обмена
  socket.on('trades.cancel', controller.cancel.bind(controller))

  // Получение количества предложений обмена
  socket.on('trades.count', controller.tradesCount.bind(controller))
}
