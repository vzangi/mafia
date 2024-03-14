const Account = require('../models/Account')
const AccountThing = require('../models/AccountThing')
const ThingType = require('../models/ThingType')
const Thing = require('../models/Thing')
const Trade = require('../models/Trade')
const TradeItem = require('../models/TradeItem')
const AccountSetting = require('../models/AccountSetting')
const Friend = require('../models/Friend')

class TradeService {
  // Данные страницы нового обмена
  async newTradePageData(account, username) {
    if (!account) {
      throw new Error('Не авторизован')
    }

    if (!username) {
      throw new Error('Нет необходимых данных')
    }

    const vizavi = await Account.findOne({ where: { username } })

    if (!vizavi) {
      throw new Error('Игрок с таким ником не найден')
    }

    const hideinvent = await AccountSetting.getHideInventSetting(vizavi.id)

    if (hideinvent == 2) {
      throw new Error(
        `Обмены с ${vizavi.username} не доступны для ${account.username}`
      )
    }

    if (hideinvent == 1) {
      const isFriends = await Friend.findOne({
        where: {
          accountId: account.id,
          friendId: vizavi.id,
        },
        order: [['id', 'DESC']],
      })

      if (!isFriends) {
        throw new Error(
          `Обмены с ${vizavi.username} не доступны для ${account.username}`
        )
      }
    }

    // Мои вещи из инвентаря
    const myThings = await AccountThing.scope({
      method: ['withThings', account.id],
    }).findAll({
      order: [['id', 'desc']],
      include: [
        {
          model: Thing,
          where: {
            forsale: true,
          },
        },
      ],
    })

    // Вещи визави
    const vizaviThings = await AccountThing.scope({
      method: ['withThings', vizavi.id],
    }).findAll({
      order: [['id', 'desc']],
      include: [
        {
          model: Thing,
          where: {
            forsale: true,
          },
        },
      ],
    })

    const types = await ThingType.findAll({
      order: [['sort']],
    })

    const data = {
      vizavi,
      vizaviThings,
      myThings,
      types,
      title: 'Предложение нового обмена',
    }

    return data
  }

  // Список новых обменов
  async tradesList(account) {
    if (!account) {
      throw new Error('Не авторизован')
    }

    const trades = await Trade.findAll({
      where: {
        toId: account.id,
        status: 0,
      },
      include: [
        { model: Account, as: 'from' },
        {
          model: TradeItem,
          include: [
            { model: Trade },
            {
              model: AccountThing,
              include: [{ model: Thing }],
            },
            { model: Account },
          ],
        },
      ],
      order: [['createdAt', 'desc']],
    })

    const data = {
      trades,
      title: 'Предложения обмена',
    }

    return data
  }
}

module.exports = new TradeService()
