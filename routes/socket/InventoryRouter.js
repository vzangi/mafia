module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/InventoryController')(
    io,
    socket
  )

  // Вещи в инвентаре
  socket.on('inventory.things', controller.inventoryThings.bind(controller))

  // Крафт
  socket.on('inventory.kraft', controller.kraft.bind(controller))

  // Активация VIP пропуска
  socket.on('vip.activate', controller.vipActivate.bind(controller))

  // Открытие пакета
  socket.on('bag.open', controller.openBag.bind(controller))

  // Получение списка вещей набора или кейса
  socket.on('nabor.things', controller.getNaborThings.bind(controller))

  // Открыть набор
  socket.on('nabor.open', controller.openNabor.bind(controller))

  // Открыть кейс
  socket.on('keis.open', controller.openKeis.bind(controller))

  // Нацепить значок
  socket.on('badge.take', controller.takeBadge.bind(controller))

  // Снять значок
  socket.on('badge.untake', controller.untakeBadge.bind(controller))

  // Взять вещь в игру
  socket.on('thing.take', controller.takeThing.bind(controller))

  // Возвращаю вещь в инвентарь
  socket.on('thing.untake', controller.untakeThing.bind(controller))
}
