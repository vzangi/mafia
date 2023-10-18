const { Op } = require('sequelize')
const Account = require('../../models/Account')
const AccountName = require('../../models/AccountName')
const WalletEvents = require('../../models/WalletEvents')
const Friend = require('../../models/Friend')
const smiles = require('../../units/smiles')
const BaseSocketController = require('./BaseSocketController')

class ApiController extends BaseSocketController {
  // Поиск пользователей по нику
  searchUsersByNik(nik, callback) {
    Account.findAccountsByNik(nik).then((accounts) => {
      callback(accounts)
    })
  }

  // Возвращаю список доступных смайлов
  smiles(callback) {
    callback(smiles)
  }

  // Установка поля "Пол" игрока
  async changeGender(gender) {
    if (gender != 0 && gender != 1 && gender != 2) return
    const { user } = this
    if (!user) return
    await Account.update(
      {
        gender,
      },
      {
        where: {
          id: user.id,
        },
      }
    )
  }

  // Смена ника
  async changeNik(newnik, callback) {
    try {
      const nik = newnik.trim()

      const { user } = this
      if (!user) return

      if (nik.trim().length < 4) {
        return callback({
          status: 1,
          msg: 'Ник не может быть короче 4 символов',
        })
      }

      if (nik.trim().length > 30) {
        return callback({
          status: 1,
          msg: 'Ник не может быть длиннее 30 символов',
        })
      }

      const nikPattern = /^[\-_а-яА-ЯёЁ0-9a-zA-Z\s]+$/g
      if (!nik.match(nikPattern)) {
        return callback({
          status: 1,
          msg: 'Ник может состоять только из букв, цифр, дефисов и знаков нижнего подчеркивания',
        })
      }

      const hasNik = await Account.count({
        where: {
          username: nik,
        },
      })

      if (hasNik != 0) {
        return callback({
          status: 1,
          msg: 'Ник уже занят',
        })
      }

      const nikInHistory = await AccountName.findOne({
        where: {
          username: nik,
        },
      })

      if (nikInHistory) {
        if (nikInHistory.accountId != user.id) {
          return callback({
            status: 1,
            msg: 'Нельзя использовать бывший ник другого игрока',
          })
        }
      }

      const account = await Account.findOne({
        where: {
          id: user.id,
        },
      })

      const namesChangesCount = await AccountName.count({
        where: {
          accountId: user.id,
        },
      })

      // Сумма необходимая для смены ника
      const price = namesChangesCount * 100

      if (account.wallet < price) {
        return callback({
          status: 1,
          msg: `Для смены ника на счету должно быть как минимум ${price} рублей`,
        })
      }

      // Списываю средства за смену ника
      if (price != 0) {
        await WalletEvents.nikChange(user.id, price)
      }

      // Сохраняю в историю предыдущий ник
      await AccountName.create({
        accountId: account.id,
        username: account.username,
      })

      // Меняю ник
      account.username = nik
      account.save()

      callback({ status: 0 })
    } catch (error) {
      console.log(error)
      callback({ status: 2, msg: 'Неизвестная ошибка при смене ника' })
    }
  }

  // Получения списка друзей со статусом "онлайн"
  async getOnlineFriends(callback) {
    const { user } = this
    if (!user) return callback(1, 'Не авторизован')

    const friends = await Friend.findAll({
      where: {
        accountId: user.id,
        [Op.or]: [
          { status: Friend.statuses.ACCEPTED },
          { status: Friend.statuses.MARRIED },
        ],
      },
      include: {
        model: Account,
        as: 'friend',
        where: {
          online: true,
        },
        attributes: ['id', 'avatar', 'username'],
      },
    })

    return callback(0, friends)
  }
}

module.exports = (io, socket) => {
  return new ApiController(io, socket)
}
