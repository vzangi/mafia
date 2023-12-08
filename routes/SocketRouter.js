const { validateTokenInSocket } = require('../units/jwt')
const { userToSocket } = require('../middlewares/AuthMiddleware')

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

  io.of('/game').on('connection', (socket) => {
    // Роуты чата игры
    require('./socket/game/ChatRouter')(io, socket)
  })
}
