$(function () {
  $('.btn-send-notify').click(function () {
    const data = {}
    data.message = $('#notify-message').val()
    data.level = $('#notify-level').val()
    data.accountId = $('#notifyForm').data().id

    socket.emit('notification.send', data, (res) => {
      const { status, msg } = res
      if (status != 0) return alert(msg)
      alert('Нотификация отправлена')
      $('#notifyForm').modal('hide')
      $('#notify-message').val('')
    })
  })
})
