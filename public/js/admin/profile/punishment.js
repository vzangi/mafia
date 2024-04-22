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

  $('.btn-show-punish-form').click(function () {
    $('#punishForm').modal('show')
  })

  $('.make-punish').click(function () {
    const data = {}
    data.type = $('.p-type').val()
    data.username = $('.p-username').val()
    data.comment = $('.p-comment').val()
    data.period = {}
    data.period.days = $('.p-days').val() * 1
    data.period.hours = $('.p-hours').val() * 1
    data.period.minutes = $('.p-minutes').val() * 1

    if (data.period.days + data.period.hours + data.period.minutes == 0)
      return alert('Период наказания не может быть нулевой')

    socket.emit('punishment.make', data, (res) => {
      const { status, msg } = res
      if (status != 0) return alert(msg)

      location.reload()
    })
  })
})
