const service = require('../services/TradeService')

class TradeController {
  // Переход в профиль по никнейму
  async newTradePage(req, res, next) {
    try {
      const { username } = req.params
      const { account } = req

      const data = await service.newTradePageData(account, username)
      res.render('pages/trades/new', data)
    } catch (error) {
      console.log(error)
      next(error)
    }
  }

  // Список предложенных обменов
  async tradesList(req, res, next) {
    try {
      const { account } = req
      
      const data = await service.tradesList(account)
      res.render('pages/trades/list', data)
    } catch (error) {
      console.log(error)
      next(error)
    }
  }
}

module.exports = new TradeController()
