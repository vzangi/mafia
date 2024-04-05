const Game = require('../models/Game')
const service = require('../services/GameService')
const log = require('../units/customLog')

class GameController {
  // Страница игры
  async game(req, res, next) {
    try {
      const { id } = req.params
      const { user } = req
      const data = await service.game(id, user)
      const template = service.getTemplateNameByType(data.game.gametypeId)
      return res.render(`pages/game/${template}`, data)
    } catch (error) {
      log(error)
      next(error)
    }
  }

  // Текущие игры
  async current(req, res, next) {
    try {
      const data = await service.current()
      res.render('pages/game/current', data)
    } catch (error) {
      log(error)
      next(error)
    }
  }

  // Архив игр
  async archive(req, res, next) {
    try {
      const data = await service.archive(req.query)
      res.render('pages/game/archive', data)
    } catch (error) {
      log(error)
      next(error)
    }
  }

  // Архив миох игр
  async myArchive(req, res, next) {
    try {
      const { account } = req
      const data = await service.myArchive(account, req.query)
      res.render('pages/game/my', data)
    } catch (error) {
      log(error)
      next(error)
    }
  }
}

module.exports = new GameController()
