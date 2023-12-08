const BaseSocketController = require('../BaseSocketController')
const Service = require('../../../services/socket/game/ChatService')

class GameController extends BaseSocketController {}

module.exports = (io, socket) => {
  return new GameController(io, socket, Service)
}
