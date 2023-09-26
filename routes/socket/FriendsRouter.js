module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/FriendsController')(
    io,
    socket
  )

  // Получение количества запросов в друзья
  socket.on('friends.request.count', controller.requestCount.bind(controller))

  // Добавление в друзья
  socket.on('friends.add', controller.add.bind(controller))

  // Подтверждение добавления в друзья
  socket.on('friends.accept', controller.accept.bind(controller))

  // Отклонение добавления в друзья
  socket.on('friends.decline', controller.decline.bind(controller))

  // Удаление из друзей
  socket.on('friends.remove', controller.remove.bind(controller))

  // Блокировка (ЧС)
  socket.on('friends.block', controller.block.bind(controller))

  // Разблокировка от ЧС
  socket.on('friends.unblock', controller.unblock.bind(controller))

  // Блокировка в ответ (ЧС)
  socket.on('friends.block.too', controller.blockToo.bind(controller))

  // Позвать в ЗАГС
  socket.on('friends.zags', controller.zags.bind(controller))

  // Согласие на ЗАГС
  socket.on('friends.zags.accept', controller.zagsAccept.bind(controller))

  // Отказ от ЗАГСА
  socket.on('friends.zags.decline', controller.zagsDecline.bind(controller))

  // Отозвать предложение
  socket.on('friends.zags.recall', controller.recall.bind(controller))

  // Развод
  socket.on('friends.divorce', controller.divorce.bind(controller))
}
