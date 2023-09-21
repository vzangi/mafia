module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/ChatController')(
    io,
    socket
  )

  // Список последних сообщений
  socket.on('chat.last', controller.lastMessages.bind(controller))

  // Пришло сообщение
  socket.on('chat.message', controller.message.bind(controller))

  // Пользователь начал что-то печатать в чате
  socket.on('chat.typing.begin', controller.typingBegin.bind(controller))

  // Пользователь перестал печатать
  socket.on('chat.typing.end', controller.typingEnd.bind(controller))
}
