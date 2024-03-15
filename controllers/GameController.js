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
			if (data.game.gametypeId == Game.types.CLASSIC) {
				return res.render('pages/game/game', data)
			}
			if (data.game.gametypeId == Game.types.SHOOTOUT) {
				return res.render('pages/game/gamePerestrelka', data)
			}
			if (data.game.gametypeId == Game.types.MULTI) {
				return res.render('pages/game/gameMulti', data)
			}
			if (data.game.gametypeId == Game.types.CONSTRUCTOR) {
				return res.render('pages/game/gameMulti', data)
			}
			next()
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
			const { year, month, day } = req.params
			const data = await service.archive(year, month, day)
			res.render('pages/game/archive', data)
		} catch (error) {
			log(error)
			next(error)
		}
	}
}

module.exports = new GameController()
