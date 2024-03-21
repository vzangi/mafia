module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/ApiController')(
    io,
    socket
  )

  // Поиск пользователя по нику
  socket.on('user.search', controller.searchUsersByNik.bind(controller))

  // Возвращаю список доступных смайлов
  socket.on('smiles.list', controller.smiles.bind(controller))

  // Получение количества запросов в друзья
  socket.on('friends.request.count', controller.requestCount.bind(controller))

  // Указание пола
  socket.on('profile.gender.change', controller.changeGender.bind(controller))

  // Список друзей онлайн
  socket.on('friends.online', controller.getOnlineFriends.bind(controller))

  // Смена ника
  socket.on('nik.change', controller.changeNik.bind(controller))

  // Получение нотификаций
  socket.on('notifies.get', controller.getNotifies.bind(controller))

  // Скрытие или отображение инвентаря
  socket.on('setting.hideinvent', controller.inventorySetting.bind(controller))

  // Настройка уведомления о начале игры в телегу
  socket.on('setting.gamenotify', controller.gamenotifySetting.bind(controller))
}
