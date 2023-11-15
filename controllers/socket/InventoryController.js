const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/InventoryService')

class InventoryController extends BaseSocketController {
  // Крафт
  async kraft(ids, callback) {
    try {
      const thing = await this.service.kraft(ids)
      callback({ status: 0, thing })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Вещи в инвентаре
  async inventoryThings(username, callback) {
    try {
      const things = await this.service.inventoryThings(username)
      callback({ status: 0, things })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new InventoryController(io, socket, Service)
}
