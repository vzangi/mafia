module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/GiftController')(
    io,
    socket
  )

  // Поиск пользователя по нику
  socket.on('gifts.getnext', controller.getNext.bind(controller))

  // Список групп открыток
  socket.on('gifts.groups', controller.giftGroups.bind(controller))

  // Список групп открыток
  socket.on('gifts.items', controller.giftItems.bind(controller))

  // Покупка открытки
  socket.on('gifts.buy', controller.giftBuy.bind(controller))

  // Покупка открытки
  socket.on('gifts.count', controller.giftsCount.bind(controller))

  // Удаление открытки
  socket.on('gifts.remove', controller.giftRemove.bind(controller))
}
