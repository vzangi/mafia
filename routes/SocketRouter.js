const { validateTokenInSocket } = require('../units/jwt')
const { userToSocket } = require('../middlewares/AuthMiddleware')
const Game = require('../models/Game')

module.exports = (io) => {
  // Пытаюсь получить пользователя по токену jwt
  io.use(validateTokenInSocket)
  io.use(userToSocket)

  // Подключение к сокету
  io.on('connection', (socket) => {
    // Роуты информации о количестве пользователей онлайн
    require('./socket/UsersCountRouter')(io, socket)

    // Роуты запросов в друзья
    require('./socket/FriendsRouter')(io, socket)

    // Роуты кошелька
    require('./socket/WalletRouter')(io, socket)

    // Роуты API
    require('./socket/ApiRouter')(io, socket)

    // Роуты приватных сообщений
    require('./socket/MessagesRouter')(io, socket)

    // Роуты открыток
    require('./socket/GiftsRouter')(io, socket)

    // Роуты нотификаций
    require('./socket/NotifyRouter')(io, socket)

    // Роуты маркета
    require('./socket/MarketRouter')(io, socket)

    // Роуты обменов
    require('./socket/TradesRouter')(io, socket)

    // Роуты инвентаря
    require('./socket/InventoryRouter')(io, socket)
  })

  io.of('/lobbi').use(validateTokenInSocket)
  io.of('/lobbi').use(userToSocket)

  // Отдельное пространство имён для основного чата
  io.of('/lobbi').on('connection', (socket) => {
    // Роуты основного чата
    require('./socket/ChatRouter')(io, socket)

    // Роуты лобби
    require('./socket/LobbiRouter')(io, socket)
  })

  io.of('/game').use(validateTokenInSocket)

  io.of('/game').use(async (socket, next) => {
    const { referer } = socket.request.headers
    socket.gameId = 1 * referer.substr(referer.indexOf('/game/') + 6, 7)
    socket.game = await Game.findByPk(socket.gameId)
    next()
  })

  io.of('/game').on('connection', (socket) => {
    const { game } = socket

    if (game) {
      // Роуты классического режима
      if (game.gametypeId == 1) {
        require('./socket/game/ClassicGameRouter')(io, socket)
      }

      // Роуты мультирежима
      if (game.gametypeId == 4) {
        require('./socket/game/MultiGameRouter')(io, socket)
      }
    }
  })
}
