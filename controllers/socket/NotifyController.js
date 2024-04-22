const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/NotifyService')
const log = require('../../units/customLog')

class NotifyController extends BaseSocketController {
  // Пометить нотификацию прочитанной
  async read(notifyId) {
    try {
      this.service.read(notifyId)
    } catch (error) {
      log(error)
    }
  }

  // Получение списка непрочитанных нотификаций
  async getNewNotifies(callback) {
    try {
      const notifies = await this.service.getNewNotifies()
      if (callback) callback({ status: 0, notifies })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Отправка нотификации пользователю
  async sendNotify(data, callback) {
    try {
      await this.service.sendNotify(data)
      if (callback) callback({ status: 0 })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new NotifyController(io, socket, Service)
}
