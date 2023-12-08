const smiles = require('../units/smiles')
const GamePlayer = require('../models/GamePlayer')

class PagesService {
  async lobbi(user) {
    const data = { smiles }
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
}

module.exports = new PagesService()
