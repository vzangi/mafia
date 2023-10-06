const { where } = require('sequelize')
const Account = require('../../models/Account')
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
}

module.exports = (io, socket) => {
  return new ApiController(io, socket)
}
