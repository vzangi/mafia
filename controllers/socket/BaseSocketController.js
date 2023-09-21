class BaseSocketController {
    constructor(io, socket) {
        this.io = io
        this.socket = socket
        this.user = socket.user
    }
}

module.exports = BaseSocketController
