function classByLevel(level) {
  return level == 1
    ? 'table-warning'
    : level == 2
    ? 'table-danger'
    : level == 3
    ? 'table-info'
    : 'table-success'
}

$(function () {
  $('.btn-more').click(function () {
    const { id } = $('.notify-list tr:last').data()

    socket.emit('notifies.get', id, (res) => {
      if (res.status != 0) {
        return alert(res.msg)
      }

      const { notifies } = res

      if (notifies.length < 10) {
        $('.btn-more').remove()
      }

      console.log(notifies)

      $('#notifyTmpl').tmpl(notifies).appendTo($('.notify-list table'))
    })
  })
})
