module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/WalletController')(
    io,
    socket
  )

  // Платёж
  socket.on('payment', controller.payment.bind(controller))

  // Последние транзакции
  socket.on('transactions', controller.transactions.bind(controller))
}
