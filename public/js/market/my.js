$(function () {
  $('.market-list').on('click', '.take-back', function (event) {
    event.preventDefault()
    const { id } = $(this).data()
    if (!id) return alert('Упс!')

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

  $('.market-list').on('click', '.change-price', function (event) {
    event.preventDefault()
    const self = this
    const { id } = $(self).data()
    if (!id) return alert('Упс!')

    prompt('Введите цену лота').then((price) => {
      if (!price) return
      if (isNaN(price)) return alert('Цена указана неверно')

      socket.emit('market.sell.on', id, price, (res) => {
        const { status, msg } = res
        if (status != 0) return alert(msg)

        $(self).text(`${price} р.`)
      })
    })

    return false
  })
})
