const service = require('../services/TradeService')
const log = require('../units/customLog')

class TradeController {
	// Переход в профиль по никнейму
	async newTradePage(req, res, next) {
		try {
			const { username } = req.params
			const { account } = req

			const data = await service.newTradePageData(account, username)
			res.render('pages/trades/new', data)
		} catch (error) {
			log(error)
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
			log(error)
			next(error)
		}
	}

	// История обменов
	async tradesHistory(req, res, next) {
		try {
			res.render('pages/trades/history', {
				title: 'История обменов',
			})
		} catch (error) {
			log(error)
			next(error)
		}
	}

	// Список отправленных обменов
	async sendedTrades(req, res, next) {
		try {
			res.render('pages/trades/sended', {
				title: 'Отправленные предложения',
			})
		} catch (error) {
			log(error)
			next(error)
		}
	}
}

module.exports = new TradeController()
