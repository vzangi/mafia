$(function () {
  const isFloat = (n) => {
    return Number(n) === n && n % 1 !== 0
  }

  const isInt = (n) => {
    return Number(n) === n && n % 1 === 0
  }

  // Удаление вещи из списка и уменьшение количества на единицу
  const decThingsCount = (thingId) => {
    const tc = $('.things-count')
    tc.text(tc.text() * 1 - 1)
    $(`.things-list-box .thing-item[data-id=${thingId}]`).remove()
  }

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
        notify('VIP активирован!')
        decThingsCount(id)
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
        notify('Вещь продана!')
        decThingsCount(id)
      })
    })
  })

  // Выставить на маркет
  $('body').on('click', '.btn-sell-on-market', function () {
    $('#thingForm').modal('hide')
    const { id } = $('#thingForm').data()
    const { thing } = $(`.things-list-box .thing-item[data-id=${id}]`).data()

    socket.emit('market.minprice', thing.thing.id, (res) => {
      if (res.status != 0) {
        return alert(res.msg)
      }

      const { minPrice } = res

      $('.min-price')
        .text(minPrice ? `${minPrice} р.` : 'нет предложений')
        .attr('href', '/market/thing/' + thing.thing.id)

      $('#sellFormImgTmpl').tmpl(thing).appendTo($('.sell-form-img').empty())

      $('#sellForm').modal('show')
    })
  })

  // Ввод цены для покупателя
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

  // Ввод суммы прибыли от продажи
  $('#navarCount').keyup(function (event) {
    const price = $(this).val() * 1
    if (price != 0) {
      $('.btn-sell-on').removeAttr('disabled')
    } else {
      $('.btn-sell-on').attr('disabled', 'disabled')
    }
    $('#sellPrice').val(((price / 90) * 100).toFixed(2))
  })

  // Установка ограничения в два знака после запятой
  $('#sellPrice, #navarCount').on('input', function (e) {
    let value = $(this).val()
    if (value.indexOf('.') != '-1') {
      value = value.substring(0, value.indexOf('.') + 3)
      $(this).val(value)
    }
  })

  // Выставить вещь на маркет
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
        notify('Вещь выставлена на маркет!')
        decThingsCount(id)
      })
    })
  })

  // Нацепить значок
  $('body').on('click', '.btn-take-badge', function () {
    const { id } = $('#thingForm').data()

    confirm('Нацепить значок на профиль?').then((accept) => {
      if (!accept) return

      socket.emit('badge.take', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        untakeBadges()

        const item = $(`.things-list-box .thing-item[data-id=${id}]`)

        item.data().thing.taked = true
        item.addClass('taked')

        $('#thingForm').modal('hide')
        notify('Значок одет!')
      })
    })
  })

  // Отцепить значок
  $('body').on('click', '.btn-untake-badge', function () {
    const { id } = $('#thingForm').data()

    confirm('Отцепить значок от профиля?').then((accept) => {
      if (!accept) return

      socket.emit('badge.untake', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        untakeBadges()

        $('#thingForm').modal('hide')
        notify('Значок снят!')
      })
    })
  })

  // Взять предмет в игру
  $('body').on('click', '.btn-take-thing', function () {
    const { id } = $('#thingForm').data()

    confirm('Взять предмет в игру?').then((accept) => {
      if (!accept) return

      socket.emit('thing.take', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        const item = $(`.things-list-box .thing-item[data-id=${id}]`)

        item.data().thing.taked = true
        item.addClass('taked')

        $('#thingForm').modal('hide')
        notify('Предмет взят в игру!')
      })
    })
  })

  // Вернуть предмет в инвентарь
  $('body').on('click', '.btn-untake-thing', function () {
    const { id } = $('#thingForm').data()

    confirm('Вернуть предмет в инвентарь?').then((accept) => {
      if (!accept) return

      socket.emit('thing.untake', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        const item = $(`.things-list-box .thing-item[data-id=${id}]`)

        item.data().thing.taked = false
        item.removeClass('taked')

        $('#thingForm').modal('hide')
        notify('Предмет вернулся в инвентарь!')
      })
    })
  })

  // Снимаю отметку
  function untakeBadges() {
    $(`.things-list-box .thing-item.taked`).each((_, item) => {
      const { thing } = $(item).data()
      if (thing.thing.thingtypeId == 6) {
        $(item).data().thing.taked = false
        $(item).removeClass('taked')
      }
    })
  }
})
