$(function () {
  // Всего транзакций
  const totalTransactions = $('.total-transactions').text() * 1

  // Получение порции транзакций
  const getTransactions = (offset) => {
    socket.emit('transactions', offset, (res) => {
      if (res.status == 0) {
        const { events } = res
        if (events.length > 0) {
          $('#eventTmpl').tmpl(events).appendTo('.transactions')
          offset += events.length
          if (offset < totalTransactions)
            $('#moreBtnTmpl').tmpl({ offset }).insertAfter('.table')
        }
      } else {
        alert(res.msg)
      }
    })
  }

  // Первичная загрузка транзакций
  if (totalTransactions == 0) {
    $('#noEventTmpl').tmpl().appendTo('.transactions')
  } else {
    getTransactions(0)
  }

  // Загрузка очередной порции транзакций при нажатии на кнопку "Загрузить ещё"
  $('article').on('click', '.moreBtn', function () {
    const { offset } = $(this).data()
    getTransactions(offset)
    $(this).remove()
  })

  $('.price-item').click(function () {
    $('.price-item').removeClass('active')
    $(this).addClass('active')
  })
  $('.other-sum').click(async function () {
    let sum = (await promptNumber('Любая сумма от 1000 до 15000')) * 1
    if (sum < 1000 || sum > 15000) return
    $('.price-item:last span').text(sum)
    $('.price-item:last').click()
  })

  $('#payBtn').click(function () {
    const sum = $('.price-item.active span').text() * 1
    const method = 1 // Способ оплаты
    if (sum < 50 || sum > 15000) return false

    socket.emit('payment', sum, method, async (res) => {
      if (res.status != 0) {
        return await alert(res.msg)
      }
      location.reload()
    })
  })

  $('#transferForm').submit(function (event) {
    event.preventDefault()

    const username = $(this).find('[name=username]').val().trim()
    const count = $(this).find('[name=count]').val() * 1
    const comment = $(this).find('[name=comment]').val().trim()

    if (username == '') {
      return alert('Введите ник получателя перевода')
    }
    if (count < 0 || count > 5000) {
      return alert('Переводить можно суммы от 1 до 5000 за раз')
    }

    socket.emit('transfer', username, count, comment, (res) => {
      if (res.status != 0) return alert(res.msg)
      location.reload()
    })

    return false
  })
})
