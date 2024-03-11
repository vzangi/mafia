const smiles = require('../units/smiles')
const Contest = require('../models/Contest')
const GamePlayer = require('../models/GamePlayer')
const Account = require('../models/Account')
const Punishment = require('../models/Punishment')
const { Op, Sequelize } = require('sequelize')
const GameEvent = require('../models/GameEvent')

class PagesService {
  async lobbi(user) {
    const data = { smiles }

    data.contests = await Contest.scope('active').findAll()

    data.top = await GameEvent.scope('top').findAll({ limit: 3 })
    data.intop = false

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

      const hasInTop = await GameEvent.findOne({
        where: {
          type: GameEvent.eventTypes.TOPWEEK,
          accountId: user.id,
        },
      })

      if (hasInTop) data.intop = true
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
        {
          model: GamePlayer,
          attributes: ['gameId'],
          where: {
            status: [
              GamePlayer.playerStatuses.IN_GAME,
              GamePlayer.playerStatuses.FREEZED,
            ],
          },
          required: false,
        },
      ],
    })

    return users
  }

  async topOfWeek() {
    const data = {}

    data.top = await GameEvent.scope('top').findAll({ limit: 10 })

    return data
  }
}

module.exports = new PagesService()
