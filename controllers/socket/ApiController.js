const BaseSocketController = require('./BaseSocketController')
const Service = require('../../services/socket/ApiService')
const log = require('../../units/customLog')

class ApiController extends BaseSocketController {
  // Получение количества запросов в друзья
  async takePromo(code, callback) {
    try {
      const msg = await this.service.takePromo(code)
      if (callback) callback({ status: 0, msg })
    } catch (error) {
      if (callback) callback({ status: 1, msg: error.message })
    }
  }
  // Получение количества запросов в друзья
  async requestCount(callback) {
    try {
      const count = await this.service.requestCount()
      if (callback) callback({ status: 0, count })
    } catch (error) {
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Игроки онлайн
  async onlineUsers(callback) {
    try {
      const users = await this.service.onlineUsers()
      if (callback) callback({ status: 0, users })
    } catch (error) {
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Поиск пользователей по нику
  async searchUsersByNik(nik, callback) {
    try {
      const accounts = await this.service.usersByNik(nik)
      if (callback) callback(accounts)
    } catch (error) {
      log(error)
    }
  }

  // Возвращаю список доступных смайлов
  async smiles(callback) {
    try {
      const smiles = await this.service.smiles()
      if (callback) callback(smiles)
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
      if (callback) callback({ status: 0 })
    } catch (error) {
      if (callback)
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
      if (callback) callback(0, friends)
    } catch (error) {
      if (callback) callback(1, error.message)
    }
  }

  // Получение нотификаций
  async getNotifies(lastId, callback) {
    try {
      const notifies = await this.service.getNotifies(lastId)
      if (callback)
        callback({
          status: 0,
          notifies,
        })
    } catch (error) {
      if (callback)
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
      if (callback) callback({ status: 0 })
    } catch (error) {
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Настройка уведомления о начале игры в телегу
  async gamenotifySetting(value, callback) {
    try {
      await this.service.gamenotifySetting(value)
      if (callback) callback({ status: 0 })
    } catch (error) {
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Настройка уведомления о начале игры в телегу
  async gameColCountSetting(value, callback) {
    try {
      await this.service.gameColCountSetting(value)
      if (callback) callback({ status: 0 })
    } catch (error) {
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Настройка уведомления о начале игры в телегу
  async gamePlaySoundSetting(value, callback) {
    try {
      await this.service.gamePlaySoundSetting(value)
      if (callback) callback({ status: 0 })
    } catch (error) {
      if (callback) callback({ status: 1, msg: error.message })
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

  // Установка скина
  async changeSkin(skin) {
    try {
      await this.service.changeSkin(skin)
    } catch (error) {
      log(error)
    }
  }

  // Установка скина
  async removeBG(callback) {
    try {
      await this.service.removeBG()
      if (callback) callback({ status: 0 })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Архив игр игрока
  async archive(userData, callback) {
    try {
      const data = await this.service.archive(userData)
      if (callback) callback({ status: 0, data })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Архив игр игрока
  async userArchive(userData, callback) {
    try {
      const data = await this.service.userArchive(userData)
      if (callback) callback({ status: 0, data })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }

  // Изменение описания пользователя
  async userAboutChange(aboutText, callback) {
    try {
      const data = await this.service.userAboutChange(aboutText)
      if (callback) callback({ status: 0, data })
    } catch (error) {
      log(error)
      if (callback) callback({ status: 1, msg: error.message })
    }
  }
}

module.exports = (io, socket) => {
  return new ApiController(io, socket, Service)
}
