$(function () {
  // Вызов формы отправки в крафт
  $('body').on('click', '.btn-kraft', function () {
    $('#thingForm').modal('hide')
    const { id } = $('#thingForm').data()
    const { thing } = $(`.things-list-box .thing-item[data-id=${id}]`).data()

    // Удаляю предыдущую форму (если была)
    $('#kraftForm').remove()

    // Создаю новую форму
    $('#kraftFormTmpl').tmpl(thing).appendTo('body')

    // Заполняю её подходящими вещами
    $('.things-list-box .thing-item')
      .filter((_, item) => {
        return (
          $(item).data().thing.thing.thingclassId == thing.thing.thingclassId &&
          $(item).data().thing.thing.thingtypeId == thing.thing.thingtypeId
        )
      })
      .each((_, item) => {
        $(item).clone().appendTo($('#kraftForm .inventory-items'))
      })

    // Нажимаю на выбранную вещь в форме
    $(`.inventory-items .thing-item[data-id=${thing.id}]`).click()

    // Отображаю форму
    $('#kraftForm').modal('show')
  })

  // Добавление вещи в список на крафт
  $('body').on('click', '.inventory-items .thing-item', function () {
    if ($('.kraft-items .thing-item').length == 10) return
    $(this).remove().appendTo('.kraft-items')

    const cnt = $('.kraft-items .thing-item').length
    $('.kraft-cnt').text(cnt)

    if ($('.kraft-items .thing-item').length == 10) {
      $('.send-kraft-btn').removeAttr('disabled')
    }
  })

  // Удаление вещи из списка крафта
  $('body').on('click', '.kraft-items .thing-item', function () {
    $(this).remove().appendTo('.inventory-items')
    $('.send-kraft-btn').attr('disabled', '')

    const cnt = $('.kraft-items .thing-item').length
    $('.kraft-cnt').text(cnt)
  })

  // Отправка в крафт
  $('body').on('click', '.send-kraft-btn', function () {
    const items = $('.kraft-items .thing-item')
    if (items.length != 10) return

    confirm('Отправить выбранные вещи в крафт?').then((accept) => {
      if (!accept) return
      const ids = $.map(items, (item) => $(item).data().id)

      // Отправляю запрос на крафт
      socket.emit('inventory.kraft', ids, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        // Вещь получена
        const { thing } = res

        // Добавляю её в список
        $('#thingTmpl').tmpl(thing).prependTo($('.things-list'))

        // Убираю из списка вещи отправенные в крафт
        ids.map((id) => {
          $(`.things-list-box .thing-item[data-id=${id}]`).remove()
        })

        // Увеличиваю количество вещей
        $('.things-count').text($('.things-list-box .thing-item').length)

        // Скрываю форму крафта
        $('#kraftForm').modal('hide')

        // Отображаю сообщение о новой вещи
        alert(`По крафту получена новая вещь: ${thing.thing.name}`).then(() => {
          // Нажимаю на вещь
          $(`.things-list-box .thing-item[data-id=${thing.id}]`).click()
        })
      })
    })
  })
})
