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

  // Получение списка вещей набора или кейса
  socket.on('nabor.things', controller.getNaborThings.bind(controller))

  // Открыть набор
  socket.on('nabor.open', controller.openNabor.bind(controller))
}
