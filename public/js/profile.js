$(function () {
  let mutex = false
  $('.more-gifts-btn').click(function () {
    if (mutex) return false
    mutex = true
    const lastId = $('.gift-item:last').data().id
    const accountId = $('.gifts-list').data().id
    console.log(lastId, accountId)

    socket.emit('gifts.getnext', accountId, lastId, (res) => {
      mutex = false

      if (res.status != 0) {
        return alert(res.msg)
      }

      let { gifts } = res

      console.log(123)

      gifts = gifts.map((gift) => {
        console.log(gift)
        gift.description = 123
        return gift
      })

      if (gifts.length < 9) {
        $('.more-btn-box').remove()
      }

      $('#giftItemTmpl').tmpl(gifts).appendTo($('.gifts-list'))

      // Включаем тултипы
      const tooltipTriggerList = [].slice.call(
        document.querySelectorAll('[data-bs-toggle="tooltip"]')
      )
      tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
      })

      console.log(gifts)
    })
  })

  socket.emit('gifts.looked')
})
