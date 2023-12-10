module.exports = (io, socket) => {
  const controller = require('../../../controllers/socket/game/GameController')(
    io,
    socket
  )

  // Получение роли в игре
  socket.on('get.role', controller.getRole.bind(controller))

  // Получение сообщений
  socket.on('get.messages', controller.getMessages.bind(controller))

  // Пришло сообщение
  socket.on('message', controller.message.bind(controller))


  // Список последних сообщений
  //socket.on('game.chat.history', controller.chatHistory.bind(controller))

  // Пришло сообщение
  //socket.on('game.chat.message', controller.message.bind(controller))

  // Пользователь начал что-то печатать в чате
  //socket.on('game.chat.typing.begin', controller.typingBegin.bind(controller))

  // Пользователь перестал печатать
  //socket.on('game.chat.typing.end', controller.typingEnd.bind(controller))
}
