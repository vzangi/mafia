module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/LobbiController')(
    io,
    socket
  )

  // Создание игры
  socket.on('game.make', controller.makeGame.bind(controller))

  // Получение текущих заявок
  socket.on('game.games', controller.getGames.bind(controller))

  // Присоединиться к заявке
  socket.on('game.to', controller.toGame.bind(controller))

  // Удаление заявки
  socket.on('game.remove', controller.removeGame.bind(controller))

  // Покинуть заявку
  socket.on('game.leave', controller.leaveGame.bind(controller))

  // Удалить из заявки игрока
  socket.on(
    'game.player.remove',
    controller.removePlayerFromGame.bind(controller)
  )
}
