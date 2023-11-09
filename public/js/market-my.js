$(function () {
  $('.market-list').on('click', '.take-back', function (event) {
    event.preventDefault()
    const { id } = $(this).data()
    if (!id) {
      return alert('Упс!')
    }

    confirm('Снять этот лот с продажи?').then((accept) => {
      if (!accept) return
      socket.emit('market.takeback', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        $(`.thing-item[data-id=${id}]`).remove()
        notify('Лот снят с продажи')
      })
    })

    return false
  })
})
