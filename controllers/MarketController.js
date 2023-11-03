const service = require('../services/MarketService')

class MarketController {
  // Список открыток
  async market(req, res) {
    try {
      const data = await service.marketData()
      res.render('pages/market/market', data)
    } catch (error) {
      console.log(error)
      res.redirect('/')
    }
  }
}

module.exports = new MarketController()
