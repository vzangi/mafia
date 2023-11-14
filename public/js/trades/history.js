$(function () {
  socket.emit('trades.history', (res) => {
    if (res.status != 0) return alert(res.msg)

    const { tradesHistory, username } = res.trades

    if (tradesHistory.length > 0) {
      show(tradesHistory, username)
      activateBSTooltips()
    } else {
      $('#noTradesTmpl').tmpl().appendTo($('.history'))
    }
  })

  function show(trades, username) {
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
      trade.my = username == trade.from.username
      return trade
    })

    $('#tradeTmpl').tmpl(trades).appendTo($('.history'))
  }
})
