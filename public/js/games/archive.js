$(function () {
  $('.date-picker').datepicker({
    dateFormat: 'dd.mm.yy',
    firstDay: 1,
    showOtherMonths: true,
    selectOtherMonths: true,
    monthNames: [
      'Январь',
      'Февраль',
      'Март',
      'Апрель',
      'Май',
      'Июнь',
      'Июль',
      'Август',
      'Сентябрь',
      'Октябрь',
      'Ноябрь',
      'Декабрь',
    ],
    dayNamesMin: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
    dayNames: [
      'Понедельник',
      'Вторник',
      'Среда',
      'Четверг',
      'Пятница',
      'Суббота',
      'Воскресенье',
    ],
  })

  const from = $('#from').val()
  const to = $('#to').val()

  function getGames(req) {
    if (from != '') req.from = from
    if (to != '') req.to = to

    socket.emit('archive', req, (res) => {
      const { status, msg, data } = res
      if (status != 0) return alert(msg)

      const { games, limit } = data
      console.log(data)

      for (let index = 0; index < games.length; index++) {
        const { game } = games[index]
        if (index + 1 == limit) {
          console.log('more...', game.id)
          $('#moreGamesTmpl').tmpl(game).appendTo($('.games-list'))
          continue
        }
        console.log(index, game)
        $('#gameTmpl').tmpl(game).appendTo($('.games-list'))
      }

      // $('#gameTmpl').tmpl(data).appendTo($('.games-list'))
    })
  }

  getGames({})

  $('.games-list').on('click', '.btn-more', function () {
    const { idless } = $(this).data()

    $(this).parent().slideUp()

    getGames({ idless })
  })
})
