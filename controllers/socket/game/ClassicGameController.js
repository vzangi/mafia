const BaseGameController = require('./BaseGameController')
const Service = require('../../../services/socket/game/ClassicGameService')

class ClassicGameController extends BaseGameController {}

module.exports = (io, socket) => {
  return new ClassicGameController(io, socket, Service)
}
