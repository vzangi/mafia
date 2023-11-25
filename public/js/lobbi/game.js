function getDeadline(d) {
  const totalSeconds = ((new Date(d)).getTime() - (new Date()).getTime()) / 1000
  if (totalSeconds < 60) {
    return `${Math.ceil(totalSeconds >= 0 ? totalSeconds : 0)} сек.`
  }
  return `${Math.ceil(totalSeconds / 60)} мин.`
}

$(function () {

  const makeGameBtn = $('.btn-make-game')
  const makeGameForm = $('#makeForm')
  const gamesList = $('.games-list')
  const gameItemTmpl = $('#gameItemTmpl')
  const username = $('.user-nik').text().trim()

  // Интервал для пересчёта времени жизни заявки
  setInterval(() => {
    $('.waithing-time').each((_, time) => {
      const { deadline } = $(time).data()
      $(time).text(getDeadline(deadline))
    })
  }, 1000)

  // Загрузка заявок
  lobbiSocket.emit('game.games', (res) => {
    if (res.status != 0) {
      return alert(res.msg)
    }
    
    const { games } = res

    const inGame = games.filter(g => 
      g.gameplayers.filter(gp => 
        gp.account.username == username).length == 1
      )

      console.log(inGame);

    if (inGame.length != 0) {
      $('body').addClass('inGame')
    }

    gameItemTmpl.tmpl(games).appendTo(gamesList)
  })

  // Открытие формы новой заявки
  makeGameBtn.click(function () {
    makeGameForm.modal('show')
  })

  // Удаление заявки
  lobbiSocket.on('game.remove', (id) => {
    if ($(`.game-item[data-id=${id}] .player[data-username=${username}]`).length == 1) {
      $('body').removeClass('inGame')
    }
    $(`.game-item[data-id=${id}]`).remove()
  })

  // Игрок прыгнул в заявку
  lobbiSocket.on('game.add.player', (gameId, player) => {
    const game = $(`.game-item[data-id=${gameId}]`)
    if (!game) return

    // Показываю игрока в заявке
    $('#gamePlayerTmpl').tmpl({ account: player }).appendTo(game.find('.players'))

    // Если текущий игрок, скрываю кнопки 
    if (player.username == username) {
      $('body').addClass('inGame')
    }

    const cnt = game.find('.player').length
    game.find('.players-count .cnt').text(cnt)
  })

  lobbiSocket.on('game.new', game => {
    gameItemTmpl.tmpl(game).appendTo(gamesList)
  })

  // Создание заявки
  $('.btn-create').click(function () {
    const typeId = $('#gameType').val()
    const waitingTime = $('#waitingTime').val()
    const playersCount = $('#gamePlayersCount').val()
    const description = $('#gameDescription').val()

    // Запрос на создание игры
    lobbiSocket.emit(
      'game.make',
      typeId,
      playersCount,
      waitingTime,
      description,
      (res) => {
        console.log(res)
        if (res.status != 0) {
          return alert(res.msg)
        }

        const { game } = res

        $('body').addClass('inGame')

        gameItemTmpl.tmpl(game).appendTo(gamesList)
      }
    )
  })

  // Присоединиться к заявке
  gamesList.on('click', '.btn-to-game', function () {
    const { id } = $(this).data()
    lobbiSocket.emit('game.to', id, (res) => {
      if (res.status != 0) {
        return alert(res.msg)
      }
    })
  })
})
