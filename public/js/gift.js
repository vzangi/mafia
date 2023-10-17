$(function () {
  const giftList = $('.gifts-list')
  const selectedGift = $('.selected-gift')
  const groupSelect = $('#group')
  const form = $('.gift-form')
  const giftId = $('input[name=giftId]')
  const to = $('input[name=to]')
  const description = $('textarea[name=message]')

  groupSelect.change(function () {
    const groupId = $(this).val()
    socket.emit('gifts.items', groupId, null, (items) => {
      giftList.empty()
      $('#giftItemTmpl').tmpl(items).appendTo(giftList)
    })
  })

  socket.emit('gifts.groups', (groups) => {
    $('#groupOptionTmpl').tmpl(groups).appendTo(groupSelect)
    groupSelect.change()
  })

  giftList.on('click', '.gift-item', function () {
    selectedGift.empty()
    const { id, src } = $(this).data()

    $('#selectedImgTmpl').tmpl({ src }).appendTo(selectedGift)

    $('input[name=giftId]').val(id)
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
      if (res.status != 0) {
        return alert(res.msg)
      }

      // Очищаю поля для новой открытки
      selectedGift.empty()
      giftId.val('')
      description.val('')

      alert('Открытка подарена!')
    })

    return false
  })
})
