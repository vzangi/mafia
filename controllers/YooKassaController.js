const service = require('../services/YooKassaService')
const log = require('../units/customLog')

class YooKassaController {
  // Пришёл ответ от ЮМоney на тестовую оплату
  async testResponse(req, res, next) {
    try {
      const { body } = req
      await service.testResponse(body)
      res.send('ok')
    } catch (error) {
      log(error)
      next(error)
    }
  }
}

module.exports = new YooKassaController()
