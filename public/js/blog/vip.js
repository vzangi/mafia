$(function () {
  $('.btn-bye-vip').click(function () {
    const { item } = $(this).data()

    if (item == 1) {
      return confirm('Купить VIP на неделю за 60 рублей?', '', 'Купить').then(
        (accept) => {
          if (accept) byeVip(1)
        }
      )
    }

    return confirm('Купить VIP на месяц за 150 рублей?', '', 'Купить').then(
      (accept) => {
        if (accept) byeVip(2)
      }
    )
  })

  function byeVip(item) {
    socket.emit('market.buy.vip', { item }, (res) => alert(res.msg))
  }
})
