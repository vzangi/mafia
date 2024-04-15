$(function () {
  const from = $('#from').val()
  const to = $('#to').val()

  function getGames(req) {
    if (from != '') req.from = from
    if (to != '') req.to = to

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
        const game = games[index]
        if (index == limit) {
          $('#moreGamesTmpl').tmpl(game).appendTo($('.games-list'))
          continue
        }
        $('#gameTmpl').tmpl(game).appendTo($('.games-list'))
      }

      activateBSTooltips()
    })
  }

  getGames({})

  $('.games-list').on('click', '.btn-more', function () {
    const { idless } = $(this).data()
    $(this).parent().slideUp()
    getGames({ idless })
  })

  $('.games-list').on('click', '.player-in-game', function (event) {
    event.preventDefault()
    const username = $(this).text()
    window.open('/profile/' + username, '_blank')
    return false
  })
})
