const smiles = require('../units/smiles')
const Contest = require('../models/Contest')
const GamePlayer = require('../models/GamePlayer')
const Account = require('../models/Account')
const Punishment = require('../models/Punishment')
const { Op } = require('sequelize')

class PagesService {
	async lobbi(user) {
		const data = { smiles }

		data.contests = await Contest.scope('active').findAll()

		if (user) {
			// Проверяю, находится ли пользователь в игре
			const playerInGame = await GamePlayer.findOne({
				where: {
					accountId: user.id,
					status: [
						GamePlayer.playerStatuses.IN_GAME,
						GamePlayer.playerStatuses.FREEZED,
					],
				},
			})

			// Если да - прикрепляю номер заявки
			if (playerInGame) {
				data.gameId = playerInGame.gameId
			}
		}

		return data
	}

	async online() {
		const users = await Account.findAll({
			where: {
				online: 1,
			},
			include: [
				{
					model: Punishment,
					where: {
						untilAt: {
							[Op.gt]: new Date().toISOString(),
						},
					},
					required: false,
				},
			],
		})

		return users
	}
}

module.exports = new PagesService()
