$(function () {
  $('.show-all-punish').click(function () {
    $('.punishments .punish').removeClass('hide')
    $(this).remove()
  })

  $('.punishments .punish').click(function () {
    $(this).next().toggle()
  })

  $('.remove-punish').click(function (event) {
    event.preventDefault()

    const { id } = $(this).data()

    confirm('Удалить запрет?').then((accept) => {
      if (!accept) return
      const p = $(`.punish[data-id=${id}]`)
      p.next().remove()
      p.remove()

      socket.emit('punishment.remove', id)
    })

    return false
  })
})
