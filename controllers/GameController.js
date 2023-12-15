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
}

module.exports = new GameController()
