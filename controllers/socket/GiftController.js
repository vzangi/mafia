const GiftGroups = require('../../models/GiftGroup')
const AccountGift = require('../../models/AccountGift')
const Account = require('../../models/Account')
const Gift = require('../../models/Gift')
const BaseSocketController = require('./BaseSocketController')
const WalletEvent = require('../../models/WalletEvents')
const { Op } = require('sequelize')
const sequelize = require('../../units/db')

class GiftController extends BaseSocketController {
  async getNext(accountId, lastId, callback) {
    try {
      const gifts = await AccountGift.scope({
        method: ['withModels', accountId, lastId],
      }).findAll()
      callback({ status: 0, gifts })
    } catch (error) {
      return callback({ status: 1, error })
    }
  }

  // Возвращает группы открыток
  async giftGroups(callback) {
    const groups = await GiftGroups.findAll({
      where: {
        active: 1,
      },
      attributes: ['id', 'name'],
      order: [['sort', 'ASC']],
    })
    callback(groups)
  }

  // Получение открыток определенной группы
  async giftItems(giftgroupId, lastId, callback) {
    const gifts = await Gift.scope({
      method: ['items', giftgroupId, lastId],
    }).findAll()

    callback(gifts)
  }

  // Покупка открытки
  async giftBuy(data, callback) {
    // С клиента приходят данные:
    // to - получатель открытки в виде ника
    // giftId - id открытки
    // description - текст открытки
    const { to, giftId } = data
    let { description } = data
    const { user, socket } = this

    if (description.length > 255) description = description.substr(0, 255)

    if (!user || !to || !giftId || !description) {
      return callback({
        status: 1,
        msg: 'Отсутсвуют необходимые данные. Открытка не подарена',
      })
    }

    try {
      // Нахожу получателя в базе
      const recipient = await Account.findOne({
        where: {
          username: to,
        },
      })

      // Если получатель не найден - завершаю процедуру
      if (!recipient) {
        return callback({ status: 1, msg: 'Игрок с таким ником не найден' })
      }

      // Отправитель
      const account = await Account.findOne({
        where: {
          id: user.id,
        },
      })

      if (recipient.id == account.id) {
        return callback({ status: 1, msg: 'Открытка самому себе? Серьёзно!?' })
      }

      // Ищу открытку в базе
      const gift = await Gift.findOne({
        where: {
          id: giftId,
        },
      })

      // Если открытка не найдена - завершаю процедуру
      if (!gift) {
        return callback({ status: 1, msg: 'Такой открытки нет в базе' })
      }

      // Если премиум-открытка, то проверяю, может ли пользователь её подарить
      if (gift.isVip) {
        if (!account.vip) {
          return callback({
            status: 1,
            msg: 'Эту открытку могут подарить только игроки, у которых есть VIP-статус',
          })
        }
      }

      // Проверяю, есть ли у игрока достаточно средств
      if (account.wallet < gift.price) {
        return callback({
          status: 1,
          msg: `Чтобы подарить эту открытку на счету должно быть как минимум ${gift.price} рублей`,
        })
      }

      // Провожу транзакцию покупки
      await WalletEvent.gift(user.id, gift.price)

      // Дарю открытку
      await AccountGift.create({
        giftId,
        accountId: recipient.id,
        fromId: user.id,
        description,
      })

      // Уведомление о новой открытке
      const ids = this.getUserSocketIds(recipient.id)
      ids.forEach((sid) => {
        socket.broadcast.to(sid).emit('gifts.notify', account.username)
      })

      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      return callback({ status: 1, msg: 'Покупка не удалась' })
    }
  }

  // Количество новых открыток
  async giftsCount(callback) {
    const { user } = this
    if (!user) return

    const giftCount = await AccountGift.count({
      where: {
        accountId: user.id,
        createdAt: {
          [Op.eq]: sequelize.col('updatedAt'),
        },
      },
    })

    callback(giftCount)
  }

  // Пометить открытки просмотренными
  async giftsLooked() {
    const { user } = this
    if (!user) return

    try {
      await AccountGift.update(
        {
          accountId: user.id,
        },
        {
          where: {
            accountId: user.id,
            createdAt: {
              [Op.eq]: sequelize.col('updatedAt'),
            },
          },
        }
      )
    } catch (error) {
      console.log(error)
    }
  }

  // Удаление открытки
  async giftRemove(giftId, callback) {
    const { user } = this
    if (!user) {
      return callback({ status: 1, msg: 'Не авторизован' })
    }

    const gift = await AccountGift.findOne({
      where: {
        id: giftId,
        accountId: user.id,
      },
    })

    if (!gift) {
      return callback({ status: 1, msg: 'Открытка не найдена' })
    }

    AccountGift.destroy({
      where: {
        id: giftId,
        accountId: user.id,
      },
    })

    callback({ status: 0 })
  }
}

module.exports = (io, socket) => {
  return new GiftController(io, socket)
}
