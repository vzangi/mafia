const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/PunishmentService')

class PunishmentController extends BaseSocketController {
  // Пополнение счёта
  async removePunish(id) {
    try {
      const { account } = this.socket

      if (account.role != 1) {
        throw new Error('Нет доступа')
      }

      await this.service.removePunish(id)
    } catch (error) {
      console.log(error)
    }
  }
}

module.exports = (io, socket) => {
  return new PunishmentController(io, socket, Service)
}
