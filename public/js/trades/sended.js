$(function () {
  socket.emit('trades.sended', (res) => {
    if (res.status != 0) return alert(res.msg)

    const { sendedTrades } = res

    if (sendedTrades.length > 0) {
      show(sendedTrades)
      activateBSTooltips()
    } else {
      $('#noTradesTmpl').tmpl().appendTo($('.sended-list'))
    }
  })

  function show(trades) {
    trades = trades.map((trade) => {
      trade.fromItems = []
      trade.toItems = []
      for (let item of trade.tradeitems) {
        if (item.account.username == trade.from.username) {
          trade.fromItems.push(item)
        } else {
          trade.toItems.push(item)
        }
      }
      return trade
    })

    $('#sendedTradeTmpl').tmpl(trades).appendTo($('.sended-list'))
  }

  $('.sended-list').on('click', '.cancel-btn', function () {
    const { id } = $(this).data()

    confirm('Отозвать предложение?').then((accept) => {
      if (!accept) return

      socket.emit('trades.cancel', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        $('#statusUserCancelledTmpl')
          .tmpl({ date: coolDate(Date.now()) })
          .appendTo($(`.trade-item[data-id=${id}] .trade-btns`).empty())
      })
    })
  })
})
