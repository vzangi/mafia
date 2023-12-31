const service = require('../services/GameService')

class GameController {
  // Страница игры
  async game(req, res, next) {
    try {
      const { id } = req.params
      const { user } = req
      const data = await service.game(id, user)
      res.render('pages/game/game', data)
    } catch (error) {
      console.log(error)
      next(error)
    }
  }

  // Текущие игры
  async current(req, res, next) {
    try {
      const games = await service.current()
      res.render('pages/game/current', { games })
    } catch (error) {
      console.log(error)
      next(error)
    }
  }

  // Архив игр
  async archive(req, res, next) {
    try {
      const { year, month, day } = req.params
      const data = await service.archive(year, month, day)
      res.render('pages/game/archive', data)
    } catch (error) {
      console.log(error)
      next(error)
    }
  }
}

module.exports = new GameController()
