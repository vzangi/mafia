$(function () {
  const giftList = $('.gifts-list')
  const selectedGift = $('.selected-gift')
  const groupSelect = $('#group')
  const form = $('.gift-form')
  const giftId = $('input[name=giftId]')
  const to = $('input[name=to]')
  const description = $('textarea[name=message]')
  let lastDate = null

  groupSelect.change(function () {
    const groupId = $(this).val()
    lastDate = null
    socket.emit('gifts.items', groupId, lastDate, (res) => {
      if (res.status == 0) {
        const items = res.gifts
        giftList.empty()
        $('.more-gifts').remove()
        $('#giftItemTmpl').tmpl(items).appendTo(giftList)
        lastDate = items[items.length - 1].updatedAt

        $('#moreGiftsBtnTmpl').tmpl().insertAfter(giftList)
      }
    })
  })

  $('main').on('click', '.more-gifts', function () {
    const groupId = groupSelect.val()
    socket.emit('gifts.items', groupId, lastDate, (res) => {
      if (res.status != 0) return
      const items = res.gifts
      if (items.length == 0) {
        $('.more-gifts').remove()
      } else {
        lastDate = items[items.length - 1].updatedAt
        $('#giftItemTmpl').tmpl(items).appendTo(giftList)
      }
    })
  })

  socket.emit('gifts.groups', (res) => {
    if (res.status == 0) {
      $('#groupOptionTmpl').tmpl(res.groups).appendTo(groupSelect)
      groupSelect.change()
    }
  })

  giftList.on('click', '.gift-item', function () {
    selectedGift.empty()
    const { id, src } = $(this).data()

    $('#selectedImgTmpl').tmpl({ src }).appendTo(selectedGift)

    $('input[name=giftId]').val(id)

    $('html, body').animate(
      {
        scrollTop: $('.gift-form').parent().offset().top + 'px',
      },
      {
        duration: 100,
        easing: 'swing',
      }
    )
  })

  // Покупка открытки
  form.submit(function (event) {
    event.preventDefault()

    if (!giftId.val()) {
      return alert('Выберите открытку')
    }
    if (!to.val()) {
      return alert('Укажите получателя открытки')
    }
    if (!description.val().trim()) {
      return alert('Укажите текст открытки')
    }

    const data = {
      giftId: giftId.val(),
      to: to.val(),
      description: description.val(),
    }

    // Отправка данных по сокету
    socket.emit('gifts.buy', data, (res) => {
      const { status, msg, deposit } = res
      if (status != 0) {
        return alert(msg)
      }

      alert('Открытка подарена!')

      // Очищаю поля для новой открытки
      selectedGift.empty()
      giftId.val('')
      description.val('')
      if (deposit != 0) $('#deposit').text(+deposit - 1)

      if (+deposit < 2) $('.deposite-value').remove()
    })

    return false
  })
})
