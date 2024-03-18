const service = require('../services/RoboKassaService')
const log = require('../units/customLog')

class RoboKassaController {
  // Пришёл ответ от Robokassa на тестовую оплату
  async testResultResponse(req, res, next) {
    try {
      const { body } = req
      await service.testResultResponse(body)
      res.send('ok')
    } catch (error) {
      log(error)
      next(error)
    }
  }

  // Пришёл ответ от Robokassa на тестовую оплату
  async testSuccessResponse(req, res, next) {
    try {
      const { body } = req
      await service.testSuccessResponse(body)
      res.send('ok')
    } catch (error) {
      log(error)
      next(error)
    }
  }

  // Пришёл ответ от Robokassa на тестовую оплату
  async testFailResponse(req, res, next) {
    try {
      const { body } = req
      await service.testSuccessResponse(body)
      res.send('ok')
    } catch (error) {
      log(error)
      next(error)
    }
  }

  // Пришёл ответ от Robokassa на оплату
  async response(req, res, next) {
    try {
      const { body } = req
      await service.response(body)
      res.send('ok')
    } catch (error) {
      log(error)
      next(error)
    }
  }
}

module.exports = new RoboKassaController()
