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
    $(`.thing-item[data-id=${thingId}]`).remove()
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
    const { thing } = $(`.thing-item[data-id=${id}]`).data()
    $('#sellFormImgTmpl').tmpl(thing).appendTo($('.sell-form-img').empty())
    $('#sellForm').modal('show')
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
    console.log(price)
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

  // Cортировка вещей
  $('.sort-box select').change(function () {
    const sortBy = $(this).val()
    const items = $('.thing-item')

    const sortedItems = items.sort((a, b) => {
      const ta = $(a).data().thing
      const tb = $(b).data().thing

      // По умолчанию
      if (sortBy == 0) {
        if (ta.id > tb.id) return -1
        if (ta.id < tb.id) return 1
        return 0
      }

      // По имени
      if (sortBy == 1) {
        if (ta.thing.name > tb.thing.name) return 1
        if (ta.thing.name < tb.thing.name) return -1
        return 0
      }

      // По классу
      if (sortBy == 2) {
        if (ta.thing.thingclassId > tb.thing.thingclassId) return -1
        if (ta.thing.thingclassId < tb.thing.thingclassId) return 1
        return 0
      }

      // По типу
      if (sortBy == 3) {
        if (ta.thing.thingtypeId > tb.thing.thingtypeId) return 1
        if (ta.thing.thingtypeId < tb.thing.thingtypeId) return -1
        return 0
      }

      // По дате
      if (sortBy == 4) {
        if (ta.createdAt > tb.createdAt) return 1
        if (ta.createdAt < tb.createdAt) return -1
        return 0
      }
    })

    for (let item of sortedItems) {
      $(item).remove().appendTo('.things-list')
    }
  })

  // Фильтрация по типу вещи
  $('.type-box select').change(function () {
    const typeId = $(this).val()
    const items = $('.thing-item')

    items.removeClass('hide-item')

    if (typeId == 0) return

    items
      .filter((_, item) => $(item).data().thing.thing.thingtypeId != typeId)
      .addClass('hide-item')
  })

  // Фильтрация по имени
  $('.filter-box input').keyup(function () {
    const filterText = $(this).val().toLowerCase()
    const items = $('.thing-item')

    items
      .show()
      .filter(
        (_, item) =>
          $(item).data().thing.thing.name.toLowerCase().indexOf(filterText) < 0
      )
      .hide()
  })
})
