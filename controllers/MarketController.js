const service = require('../services/MarketService')

class MarketController {
  // Список вещей на продажу
  async market(req, res) {
    try {
      const data = await service.marketData()
      res.render('pages/market/market', data)
    } catch (error) {
      console.log(error)
      res.redirect('/')
    }
  }

  // Предложения по вещи
  async thing(req, res) {
    try {
      const { id } = req.params
      const data = await service.thingData(id)
      res.render('pages/market/thing', data)
    } catch (error) {
      console.log(error)
      res.redirect('/market')
    }
  }
}

module.exports = new MarketController()
