$(function () {
  const isFloat = (n) => {
    return Number(n) === n && n % 1 !== 0
  }

  const isInt = (n) => {
    return Number(n) === n && n % 1 === 0
  }

  // Клик на вещи
  $('.things-list').on('click', '.thing-item', function () {
    // Беру вещь из аттрибута data
    const { thing } = $(this).data()

    // распаршиваю описание на отдельные строки
    thing.lines = thing.thing.description.split('\r\n')
    // console.log(thing)

    // Удаляю предыдущую форму (если была)
    $('#thingForm').remove()

    // Создаю новую форму
    $('#formTmpl').tmpl(thing).appendTo('body')

    // Отображаю форму
    $('#thingForm').modal('show')
  })

  // Активация VIP пропуска
  $('body').on('click', '.btn-activate', function () {
    $('#thingForm').modal('hide')
    confirm('Активировать VIP пропуск?').then((accept) => {
      if (!accept) {
        $('#thingForm').modal('show')
        return
      }

      const { id } = $('#thingForm').data()

      socket.emit('vip.activate', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }
        alert('VIP активирован!').then(() => {
          $(`.thing-item[data-id=${id}]`).remove()
        })
      })
    })
  })

  // Продажа вещи
  $('body').on('click', '.btn-sell', function () {
    $('#thingForm').modal('hide')
    confirm('Продать вещь по себестоймости?').then((accept) => {
      if (!accept) {
        $('#thingForm').modal('show')
        return
      }

      const { id } = $('#thingForm').data()

      socket.emit('market.sell', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }
        alert('Вещь продана!').then(() => {
          $(`.thing-item[data-id=${id}]`).remove()
        })
      })
    })
  })

  // Выставить на маркет
  $('body').on('click', '.btn-sell-on-market', function () {
    $('#thingForm').modal('hide')
    const { id } = $('#thingForm').data()
    const { thing } = $(`.thing-item[data-id=${id}]`).data()
    console.log(thing)
    $('#sellFormImgTmpl').tmpl(thing).appendTo($('.sell-form-img').empty())

    $('#sellForm').modal('show')
  })

  $('#sellPrice').keyup(function (event) {
    const price = $(this).val() * 1
    console.log(price)
    if (price != 0) {
      $('.btn-sell-on').removeAttr('disabled')
    } else {
      $('.btn-sell-on').attr('disabled', 'disabled')
    }
    $('#navarCount').val((price * 0.9).toFixed(2))
  })

  $('#navarCount').keyup(function (event) {
    const price = $(this).val() * 1
    console.log(price)
    if (price != 0) {
      $('.btn-sell-on').removeAttr('disabled')
    } else {
      $('.btn-sell-on').attr('disabled', 'disabled')
    }
    $('#sellPrice').val(((price / 90) * 100).toFixed(2))
  })

  $('.btn-sell-on').click(function () {
    const { id } = $('#thingForm').data()
    const price = $('#sellPrice').val()

    $('#sellForm').modal('hide')

    confirm('Выставить вещь на продажу?').then((accept) => {
      if (!accept) {
        $('#thingForm').modal('show')
        return
      }

      socket.emit('market.sell.on', id, price, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }
        alert('Вещь выставлена в маркет!').then(() => {
          $(`.thing-item[data-id=${id}]`).remove()
        })
      })
    })
  })
})
