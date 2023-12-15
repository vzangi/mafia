const Account = require('../models/Account')
const Game = require('../models/Game')
const GamePlayer = require('../models/GamePlayer')
const GameStep = require('../models/GameStep')
const smiles = require('../units/smiles')

class GameService {
  // Страница игры
  async game(gameId, user) {
    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    const game = await Game.findByPk(gameId)

    if (!game) {
      throw new Error('Игра не найдена')
    }

    if (game.status < 2) {
      throw new Error('В эту игру нельзя войти')
    }

    const data = {
      smiles,
      game,
    }

    data.isPlayer = false

    if (user) {
      const inGame = await GamePlayer.findOne({
        where: {
          gameId,
          accountId: user.id,
          status: [
            GamePlayer.playerStatuses.IN_GAME,
            GamePlayer.playerStatuses.FREEZED,
          ],
        },
      })

      if (inGame) {
        data.isPlayer = true
        data.isFreezed = inGame.status == GamePlayer.playerStatuses.FREEZED
      }
    }

    const seconds = Math.floor(
      (new Date(game.deadline) * 1) / 1000 - (Date.now() * 1) / 1000
    )
    data.seconds = seconds < 0 ? 0 : seconds

    data.players = await GamePlayer.scope({
      method: ['ingame', gameId],
    }).findAll()

    // Если идёт голосование, то достаю текущие голоса
    if (game.period == 2) {
      data.steps = await GameStep.findAll({
        where: {
          gameId,
          day: game.day,
          stepType: 1,
        },
        include: [
          {
            model: Account,
            as: 'account',
            attributes: ['username'],
          },
          {
            model: Account,
            as: 'player',
            attributes: ['username'],
          },
        ],
      })
    }

    return data
  }
}

module.exports = new GameService()
