const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/ApiService')
const log = require('../../units/customLog')

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
      log(error)
    }
  }

  // Возвращаю список доступных смайлов
  async smiles(callback) {
    try {
      const smiles = await this.service.smiles()
      callback(smiles)
    } catch (error) {
      log(error)
    }
  }

  // Установка поля "Пол" игрока
  async changeGender(gender) {
    try {
      await this.service.changeGender(gender)
    } catch (error) {
      log(error)
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

  // Получение нотификаций
  async getNotifies(lastId, callback) {
    try {
      const notifies = await this.service.getNotifies(lastId)
      callback({
        status: 0,
        notifies,
      })
    } catch (error) {
      callback({
        status: 1,
        msg: error.message,
      })
    }
  }

  // Скрытие или отображение инвентаря
  async inventorySetting(value, callback) {
    try {
      await this.service.inventorySetting(value)
      callback({ status: 0 })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Настройка уведомления о начале игры в телегу
  async gamenotifySetting(value, callback) {
    try {
      await this.service.gamenotifySetting(value)
      callback({ status: 0 })
    } catch (error) {
      callback({ status: 1, msg: error.message })
    }
  }

  // Установка индексируемости профиля
  async indexable(data, callback) {
    try {
      await this.service.indexable(data)
      if (callback) callback({ status: 0 })
    } catch (error) {
      if (callback) callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new ApiController(io, socket, Service)
}
