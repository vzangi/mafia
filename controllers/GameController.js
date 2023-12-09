const service = require('../services/GameService')

class GameController {
  // Страница игры
  async game(req, res, next) {
    try {
      const { id } = req.params

      const data = await service.game(id)
      res.render('pages/game/game', data)
    } catch (error) {
      console.log(error)
      next(error)
    }
  }
}

module.exports = new GameController()
