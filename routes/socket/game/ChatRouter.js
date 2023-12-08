module.exports = (io, socket) => {
  const controller = require('../../../controllers/socket/game/ChatController')(
    io,
    socket
  )

  // Список последних сообщений
  //socket.on('game.chat.history', controller.chatHistory.bind(controller))

  // Пришло сообщение
  //socket.on('game.chat.message', controller.message.bind(controller))

  // Пользователь начал что-то печатать в чате
  //socket.on('game.chat.typing.begin', controller.typingBegin.bind(controller))

  // Пользователь перестал печатать
  //socket.on('game.chat.typing.end', controller.typingEnd.bind(controller))
}
