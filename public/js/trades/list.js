$(function () {
  // Обновление количества предложений обмена
  function updateTradesCount() {
    socket.emit('trades.count', (res) => {
      if (res.status != 0) return
      setCount(res.count, '.new-trades-count')
    })
  }

  // Нажатие на "Отменить"
  $('.decline-btn').click(function () {
    const { id } = $(this).data()
    confirm('Отклонить обмен?').then((accept) => {
      if (!accept) return

      socket.emit('trades.decline', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }
        $(`.trade-item[data-id=${id}]`).remove()

        updateTradesCount()
        notify('Обмен отклонён')
      })
    })
  })

  // Нажатие на "Принять"
  $('.accept-btn').click(function () {
    const { id } = $(this).data()
    confirm('Принять обмен?').then((accept) => {
      if (!accept) return

      socket.emit('trades.accept', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        const { cancelledTrades } = res
        for (let trade of cancelledTrades) {
          $('#statusCancelledTmpl')
            .tmpl({ date: coolDate(Date.now()) })
            .appendTo($(`.trade-item[data-id=${trade}] .trade-btns`).empty())
        }

        // Показываю статус обмена
        $('#statusAcceptTmpl')
          .tmpl({ date: coolDate(Date.now()) })
          .appendTo($(`.trade-item[data-id=${id}] .trade-btns`).empty())

        updateTradesCount()
        notify('Обмен успешно принят')
      })
    })
  })
})
