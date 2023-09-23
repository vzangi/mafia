module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/ApiController')(
    io,
    socket
  )

  // Поиск пользователя по нику
  socket.on('user.search', controller.searchUsersByNik.bind(controller))

  // Возвращаю список доступных смайлов
  socket.on('smiles.list', controller.smiles.bind(controller))

  // Платёж
  socket.on('payment', controller.payment.bind(controller))

  // Последние транзакции
  socket.on('transactions', controller.transactions.bind(controller))
}
