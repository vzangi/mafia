$(function () {
  $('.market-list').on('click', '.buy', function () {
    const { id } = $(this).data()
    if (!id) return alert('Упс!')
    confirm('Купить этот лот?').then((accept) => {
      if (!accept) return
      socket.emit('market.buy', id, (res) => {
        const { status, msg } = res
        if (status != 0) return alert(msg)

        $(`.thing-item[data-id=${id}]`).remove()
        notify('Покупка успешно проведена!')
      })
    })
  })

  $('.market-list').on('click', '.take-back', function () {
    const { id } = $(this).data()
    if (!id) return alert('Упс!')

    confirm('Снять этот лот с продажи?').then((accept) => {
      if (!accept) return
      socket.emit('market.takeback', id, (res) => {
        const { status, msg } = res
        if (status != 0) return alert(msg)

        $(`.thing-item[data-id=${id}]`).remove()
        notify('Лот снят с продажи')
      })
    })
  })

  $('.market-list').on('click', '.change-price', function () {
    const { id } = $(this).data()
    if (!id) return alert('Упс!')

    prompt('Введите цену лота').then((price) => {
      if (!price) return
      if (isNaN(price)) return alert('Цена указана неверно')

      socket.emit('market.sell.on', id, price, (res) => {
        const { status, msg } = res
        if (status != 0) return alert(msg)

        location.reload()
      })
    })
  })
})
