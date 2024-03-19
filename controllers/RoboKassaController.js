const service = require('../services/RoboKassaService')
const log = require('../units/customLog')

class RoboKassaController {
  // Пришёл ответ от Robokassa на тестовую оплату
  async testResultResponse(req, res, next) {
    try {
      const { body } = req
      const invId = await service.testResultResponse(body)
      res.send(`OK${invId}`)
    } catch (error) {
      log(error)
      next(error)
    }
  }

  // Пришёл ответ от Robokassa на оплату
  async response(req, res, next) {
    try {
      const { body } = req
      const invId = await service.response(body)
      res.send(`OK${invId}`)
    } catch (error) {
      log(error)
      next(error)
    }
  }

  // Платёж в Robokassa завершился успешно
  async success(req, res, next) {
    try {
      const { body } = req
      res.redirect('/profile/wallet')
    } catch (error) {
      log(error)
      next(error)
    }
  }

  // Платёж в Robokassa не удался
  async fail(req, res, next) {
    try {
      const { body } = req
      res.redirect('/profile/wallet')
    } catch (error) {
      log(error)
      next(error)
    }
  }
}

module.exports = new RoboKassaController()
