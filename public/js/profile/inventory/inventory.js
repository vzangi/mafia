$(function () {
  // Клик на вещи
  $('.things-list-box .things-list').on('click', '.thing-item', function () {
    // Беру вещь из аттрибута data
    const { thing } = $(this).data()

    // Если вещь - набор или кейс, получаю вещи, которые можно из него достать
    if (thing.thing.thingtypeId == 3 || thing.thing.thingtypeId == 4) {
      return socket.emit('nabor.things', thing.thing.id, (res) => {
        if (res.status == 0) {
          thing.naborThings = res.things
        }

        showThing(thing)
      })
    }
    showThing(thing)
  })

  // Открыть набор
  $('body').on('click', '.btn-open-nabor', function () {
    const { id } = $('#thingForm').data()

    confirm('Открыть набор?').then((accept) => {
      if (!accept) return

      socket.emit('nabor.open', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        // Вещь получена
        const { thing } = res

        // Удаляю набор из списка
        $(`.things-list-box .thing-item[data-id=${id}]`).remove()

        // Добавляю новую вещь
        $('#thingTmpl').tmpl(thing).prependTo($('.things-list'))

        // Скрываю форму
        $('#thingForm').modal('hide')

        // Отображаю сообщение о новой вещи
        alert(`Получена новая вещь: ${thing.thing.name}`).then(() => {
          // Нажимаю на вещь
          $(`.things-list-box .thing-item[data-id=${thing.id}]`).click()
        })
      })
    })
  })

  // Открыть кейс
  $('body').on('click', '.btn-open-keis', function () {
    const { id } = $('#thingForm').data()

    confirm('Открыть кейс?').then((accept) => {
      if (!accept) return

      socket.emit('keis.open', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        // Вещь получена
        const { thing, keyId } = res.data

        // Удаляю кейс из списка
        $(`.things-list-box .thing-item[data-id=${id}]`).remove()

        // Удаляю ключ из списка
        $(`.things-list-box .thing-item[data-id=${keyId}]`).remove()

        // Добавляю новую вещь
        $('#thingTmpl').tmpl(thing).prependTo($('.things-list'))

        // Обновляю количество вещей
        $('.things-count').text($('.things-list-box .thing-item').length)

        // Скрываю форму
        $('#thingForm').modal('hide')

        // Отображаю сообщение о новой вещи
        alert(`Получена новая вещь: ${thing.thing.name}`).then(() => {
          // Нажимаю на вещь
          $(`.things-list-box .thing-item[data-id=${thing.id}]`).click()
        })
      })
    })
  })

  function showThing(thing) {
    // распаршиваю описание на отдельные строки
    thing.lines = thing.thing.description.split('\r\n')
    // console.log(thing)

    // Удаляю предыдущую форму (если была)
    $('#thingForm').remove()

    // Создаю новую форму
    $('#formTmpl').tmpl(thing).appendTo('body')

    // Отображаю форму
    $('#thingForm').modal('show')
  }

  const username = $('.user-name').text()

  socket.emit('inventory.things', username, (res) => {
    if (res.status != 0) {
      return alert(res.msg)
    }

    const { things } = res

    if (things.length != 0) {
      $('#thingTmpl').tmpl(res.things).appendTo($('.things-list').empty())
    } else {
      $('#noThingsTmpl').tmpl().appendTo($('.things-list').empty())
    }
  })
})
