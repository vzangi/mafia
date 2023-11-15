module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/InventoryController')(
    io,
    socket
  )

  // Крафт
  socket.on('inventory.kraft', controller.kraft.bind(controller))

  // Вещи в инвентаре
  socket.on('inventory.things', controller.inventoryThings.bind(controller))
}
