const { where, Op } = require('sequelize')
const Account = require('../../models/Account')
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
