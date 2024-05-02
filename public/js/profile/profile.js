$(function () {
  let mutex = false

  function loadGifts(btn, tmpl, lastId, toBlock) {
    if (mutex) return false
    mutex = true
    const accountId = $('.gifts-list').data().id

    socket.emit('gifts.getnext', accountId, lastId, (res) => {
      mutex = false

      if (res.status != 0) {
        return alert(res.msg)
      }

      let { gifts } = res

      if (gifts.length < 9) {
        $(btn).remove()
      }

      gifts = gifts.map((gift) => {
        gift.description = gift.description.trim().replaceAll('\n', '<br>')
        return gift
      })

      $(tmpl).tmpl(gifts).appendTo($(toBlock))

      // Включаем тултипы
      activateBSTooltips()
    })
  }

  $('.more-gift-list').click(function () {
    const lastId = $('.gift-list-item:last').data().id
    loadGifts(this, '#giftListItemTmpl', lastId, '.big-gifts')
  })

  $('.more-gifts-btn').click(function () {
    const lastId = $('.gift-item:last').data().id
    loadGifts(this, '#giftItemTmpl', lastId, '.gifts-list')
  })
})
