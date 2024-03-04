$(function () {
  const chat = $('.chat')

  chat.on('click', '.btn-remove-message', function () {
    const { id } = $(this).data()
    if (!id) return

    confirm('Удалить сообщение?').then((accept) => {
      if (!accept) return

      lobbiSocket.emit('chat.message.remove', id)
    })
  })
})
