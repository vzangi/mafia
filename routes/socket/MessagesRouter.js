module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/MessagesController')(
    io,
    socket
  )

  // Проверка, находятся ли игроки в дружеских отношениях
  socket.on('isFriend', controller.isFriend.bind(controller))

  // Получение приватных сообщений
  socket.on('messages.get', controller.getMessages.bind(controller))

  // Получение списка игроков, с которыми был приватный чат
  socket.on('messages.list', controller.getList.bind(controller))
}
