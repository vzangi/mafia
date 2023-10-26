const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/ApiService')

class ApiController extends BaseSocketController {

  // Получение количества запросов в друзья
  async requestCount(callback) {
    try {
      const count = await this.service.requestCount()
      callback({ status: 0, count })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }
  
  // Поиск пользователей по нику
  async searchUsersByNik(nik, callback) {
    try {
      const accounts = await this.service.usersByNik(nik)
      callback(accounts)
    } catch (error) {
      console.log(error)
    }
  }

  // Возвращаю список доступных смайлов
  async smiles(callback) {
    try {
      const smiles = await this.service.smiles()
      callback(smiles)
    } catch (error) {
      console.log(error)
    }
  }

  // Установка поля "Пол" игрока
  async changeGender(gender) {
    try {
      await this.service.changeGender(gender)
    } catch (error) {
      console.log(error);
    }
  }

  // Смена ника
  async changeNik(nik, callback) {
    try {
      await this.service.changeNik(nik)
      callback({ status: 0 })
    } catch (error) {
      callback({
        status: 1,
        msg: error.message,
      })
    }
  }

  // Получения списка друзей со статусом "онлайн"
  async getOnlineFriends(callback) {
    try {
      const friends = await this.service.getOnlineFriends()
      callback(0, friends)
    } catch (error) {
      callback(1, error.message)
    }
  }
}

module.exports = (io, socket) => {
  return new ApiController(io, socket, Service)
}
