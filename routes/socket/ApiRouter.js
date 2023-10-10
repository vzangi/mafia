module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/ApiController')(
    io,
    socket
  )

  // Поиск пользователя по нику
  socket.on('user.search', controller.searchUsersByNik.bind(controller))

  // Возвращаю список доступных смайлов
  socket.on('smiles.list', controller.smiles.bind(controller))

  // Указание пола
  socket.on('profile.gender.change', controller.changeGender.bind(controller))

  // Список друзей онлайн
  socket.on('friends.online', controller.getOnlineFriends.bind(controller))
}
