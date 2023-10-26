const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/UserCountService')

class UsersCountController extends BaseSocketController {
  
  // Количество подключенных пользователей
  count(callback) {
    try {
      const count = this.service.count()
      callback({ count })
    } catch (error) {
      console.log(error)
      callback({ count: 0})
    }
  }

  // Процедура при подключении сокета
  connect() {
    try {
      this.service.connect()
    } catch (error) {
      console.log(error)
    }
  }

  // При закрытии сокета
  disconnect() {
    try {
      this.service.disconnect()
    } catch (error) {
      console.log(error)
    }
  }
}

module.exports = (io, socket) => {
  return new UsersCountController(io, socket, Service)
}
