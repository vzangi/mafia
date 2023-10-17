const { validateTokenInSocket } = require('../units/jwt')

module.exports = (io) => {
  // Пытаюсь получить пользователя по токену jwt
  io.use(validateTokenInSocket)

  // Подключение к сокету
  io.on('connection', (socket) => {
    // Роуты информации о количестве пользователей онлайн
    require('./socket/UsersCountRouter')(io, socket)

    // Роуты запросов в друзья
    require('./socket/FriendsRouter')(io, socket)

    // Роуты основного чата
    require('./socket/ChatRouter')(io, socket)

    // Роуты кошелька
    require('./socket/WalletRouter')(io, socket)

    // Роуты API
    require('./socket/ApiRouter')(io, socket)

    // Роуты приватных сообщений
    require('./socket/MessagesRouter')(io, socket)

    // Роуты Открыток
    require('./socket/GiftsRouter')(io, socket)
  })
}
