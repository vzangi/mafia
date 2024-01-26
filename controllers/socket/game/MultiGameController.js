const BaseGameController = require('./BaseGameController')
const Service = require('../../../services/socket/game/MultiGameService')

class MultiGameController extends BaseGameController {}

module.exports = (io, socket) => {
  return new MultiGameController(io, socket, Service)
}
