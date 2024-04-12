const { Op } = require('sequelize')
const Account = require('../models/Account')
const GamePlayer = require('../models/GamePlayer')
const Punishment = require('../models/Punishment')

// Игроки онлайн
const online = async () => {
  const users = await Account.findAll({
    where: {
      online: 1,
    },
    attributes: ['username', 'avatar'],
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

module.exports = {
  online,
}
