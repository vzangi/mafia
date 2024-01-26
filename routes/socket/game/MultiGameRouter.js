module.exports = (io, socket) => {
  const controller =
    require('../../../controllers/socket/game/MultiGameController')(io, socket)

  // Получение роли в игре
  socket.on('get.role', controller.getRole.bind(controller))

  // Получение известных ролей в игре
  socket.on('get.roles', controller.getRoles.bind(controller))

  // Получение сообщений
  socket.on('get.messages', controller.getMessages.bind(controller))

  // Лог игры
  socket.on('get.log', controller.getLog.bind(controller))

  // Пришло сообщение
  socket.on('message', controller.message.bind(controller))

  // Голос
  socket.on('vote', controller.vote.bind(controller))

  // Выстрел
  socket.on('shot', controller.shot.bind(controller))

  // Прова
  socket.on('prova', controller.prova.bind(controller))

  // Кто-то печатает
  socket.on('typing.begin', controller.typingBegin.bind(controller))

  // Кто-то закончил печатать
  socket.on('typing.end', controller.typingEnd.bind(controller))
}
