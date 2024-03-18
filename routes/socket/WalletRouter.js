module.exports = (io, socket) => {
  const controller = require('../../controllers/socket/WalletController')(
    io,
    socket
  )

  // Платёж
  socket.on('payment', controller.payment.bind(controller))

  // Платёж
  socket.on('payment.euro', controller.paymentEuro.bind(controller))

  // Последние транзакции
  socket.on('transactions', controller.transactions.bind(controller))

  // Перевод
  socket.on('transfer', controller.transfer.bind(controller))
}
