module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/ApiController')(
    io,
    socket
  )

  const { account } = socket

  // Поиск пользователя по нику
  socket.on('user.search', controller.searchUsersByNik.bind(controller))

  // Игроки онлайн
  socket.on('users.online', controller.onlineUsers.bind(controller))

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

  if (account && account.id == 1) {
    // Установка индексируемости профиля
    socket.on('indexable', controller.indexable.bind(controller))
  }

  // Иземенение настройки звука в начале игры
  socket.on(
    'profile.gameplaysound.change',
    controller.gamePlaySoundSetting.bind(controller)
  )

  // Иземенение количества колонок в игре
  socket.on(
    'profile.colcount.change',
    controller.gameColCountSetting.bind(controller)
  )

  // Иземенение скина
  socket.on('profile.skin.change', controller.changeSkin.bind(controller))

  // Иземенение скина
  socket.on('profile.bg.remove', controller.removeBG.bind(controller))

  // Архив игр игрока
  socket.on('myarchive', controller.userArchive.bind(controller))

  // Архив игр игрока
  socket.on('archive', controller.archive.bind(controller))

  // Изменение описания пользователя
  socket.on('profile.about.change', controller.userAboutChange.bind(controller))

  // Активация промо-кода
  socket.on('promo.take', controller.takePromo.bind(controller))
}
