const Account = require('../../models/Account')
const smiles = require('../../units/smiles')
const BaseSocketController = require('./BaseSocketController')

class ApiController extends BaseSocketController {

    // Поиск пользователей по нику    
    searchUsersByNik(nik, callback) {
        Account.findAccountsByNik(nik).then(accounts => {
            callback(accounts)
        })
    }

    // Возвращаю список доступных смайлов
    smiles(callback) {
        callback(smiles)
    }
}


module.exports = (io, socket) => {
    return new ApiController(io, socket)
}
