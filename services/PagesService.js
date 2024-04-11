const smiles = require('../units/smiles')
const Contest = require('../models/Contest')
const GamePlayer = require('../models/GamePlayer')
const Account = require('../models/Account')
const GameEvent = require('../models/GameEvent')
const WalletEvent = require('../models/WalletEvents')
const Notification = require('../models/Notification')
const { online } = require('../units/AccountHelper')

class PagesService {
  async lobbi(user) {
    const data = { smiles }
    const playersInTop = 3

    data.contests = await Contest.scope('active').findAll()

    data.top = await GameEvent.scope('top').findAll({ limit: playersInTop })
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

      if (hasInTop) {
        data.intop = true

        //Место в топе
        const [place, player] = await GameEvent.positionInTop(user.id)
        if (place > playersInTop) {
          data.place = place
          data.playerInTop = player
        }
      }
    }

    data.users = await online()

    return data
  }

  async online() {
    const users = await online()
    return users
  }

  async topOfWeek(user) {
    const data = {}
    const playersInTop = 10

    data.top = await GameEvent.scope('top').findAll({ limit: playersInTop })

    if (user) {
      //Место в топе
      const [place, player] = await GameEvent.positionInTop(user.id)
      if (place && place > playersInTop) {
        data.place = place
        data.playerInTop = player
      }
    }

    return data
  }

  async clearTopOfWeek(secret) {
    const s = process.env.CLEAR_SECRET || 123
    if (secret != s) throw new Error('Неверные данные')

    // Беру трёх победителей
    const top = await GameEvent.scope('top').findAll({ limit: 3 })

    // Распределение призового фонда
    const prizes = [600, 300, 100]

    // Прохожусь по каждому победителю
    for (let index = 0; index < top.length; index++) {
      const player = top[index]

      console.log(player.accountId, player.username, prizes[index])

      // Закидываю игроку выигрыш
      await WalletEvent.payment(player.accountId, prizes[index])

      // Отправляю уведомление
      const message = `Вы получили ${prizes[index]} рублей за ${
        index + 1
      }-е место в топе недели!`
      const newNotify = await Notification.create({
        accountId: player.accountId,
        message,
        level: 4,
      })

      // Заменяю типы событий, чтобы очистить список топа недели
      await GameEvent.update(
        {
          type: GameEvent.eventTypes.TOPWEEK + 10,
        },
        {
          where: {
            type: GameEvent.eventTypes.TOPWEEK,
          },
        }
      )
    }
  }

  async users() {
    const data = {}

    data.users = await Account.findAll({
      order: [['id', 'desc']],
    })

    return data
  }
}

module.exports = new PagesService()
