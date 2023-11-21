const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/InventoryService')

class InventoryController extends BaseSocketController {
  // Вещи в инвентаре
  async inventoryThings(username, callback) {
    try {
      const things = await this.service.inventoryThings(username)
      callback({ status: 0, things })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Крафт
  async kraft(ids, callback) {
    try {
      const thing = await this.service.kraft(ids)
      callback({ status: 0, thing })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Активация VIP пропуска
  async vipActivate(id, callback) {
    try {
      await this.service.vipActivate(id)
      callback({ status: 0 })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Получение списка вещей набора или кейса
  async getNaborThings(id, callback) {
    try {
      const things = await this.service.getNaborThings(id)
      callback({ status: 0, things })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Открыть набор
  async openNabor(naborId, callback) {
    try {
      const thing = await this.service.openNabor(naborId)
      callback({ status: 0, thing })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }

  // Открыть кейс
  async openKeis(keisId, callback) {
    try {
      const data = await this.service.openKeis(keisId)
      callback({ status: 0, data })
    } catch (error) {
      console.log(error)
      callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new InventoryController(io, socket, Service)
}
