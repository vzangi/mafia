$(function () {
  // Клик на вещи
  $('.things-list-box .things-list').on('click', '.thing-item', function () {
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
