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
}
