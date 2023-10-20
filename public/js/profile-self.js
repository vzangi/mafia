$(function () {
  $('.gifts-list').on('contextmenu', '.gift-item', function () {
    const { id } = $(this).data()
    confirm('Удалить открытку?').then((answer) => {
      if (answer) {
        socket.emit('gifts.remove', id, (res) => {
          if (res.status == 0) {
            $(`.gift-item[data-id=${id}]`).remove()
          }
        })
      }
    })
    return false
  })

  socket.emit('gifts.looked')
})
