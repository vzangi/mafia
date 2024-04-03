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
  const gameResult = $('#gameResult').val()
  const userRoles = $('#userRoles').val()

  function getGames(req) {
    if (from != '') req.from = from
    if (to != '') req.to = to
    if (gameResult != '') req.gameResult = gameResult
    if (userRoles != '') req.userRoles = userRoles

    socket.emit('archive', req, (res) => {
      $('.games-list .loader').remove()

      const { status, msg, data } = res
      if (status != 0) return alert(msg)

      const { games, limit } = data

      if (games.length == 0) {
        $('#noGamesTmpl').tmpl().appendTo($('.games-list'))

        return
      }

      for (let index = 0; index < games.length; index++) {
        const { game } = games[index]
        if (index == limit) {
          $('#moreGamesTmpl').tmpl(games[index]).appendTo($('.games-list'))
          continue
        }
        $('#gameTmpl').tmpl(game).appendTo($('.games-list'))
      }
    })
  }

  getGames({})

  $('.games-list').on('click', '.btn-more', function () {
    const { idless } = $(this).data()
    $(this).parent().slideUp()
    getGames({ idless })
  })
})
