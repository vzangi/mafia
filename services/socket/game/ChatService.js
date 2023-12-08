const BaseService = require('../BaseService')

class ChatService extends BaseService {
  constructor(io, socket) {
    super(io, socket)

    // socket.join("some room");
  }
}

module.exports = ChatService
