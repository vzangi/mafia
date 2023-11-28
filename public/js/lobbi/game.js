$(function () {
  const makeGameBtn = $('.btn-make-game')
  const makeGameForm = $('#makeForm')
  const gamesList = $('.games-list')
  const gameItemTmpl = $('#gameItemTmpl')
  const username = $('.user-nik').text().trim()

  // Функция пересчёта времени дедлайна заявки
  const calcDeadline = (seconds, stamp) => {
    const totalSeconds = seconds + stamp / 1000 - Date.now() / 1000
    if (totalSeconds < 60) {
      return `${Math.ceil(totalSeconds >= 0 ? totalSeconds : 0)} сек.`
    }
    return `${Math.ceil(totalSeconds / 60)} мин.`
  }

  // Интервал для пересчёта времени жизни заявки
  setInterval(() => {
    $('.waithing-time').each((_, time) => {
      const { seconds, stamp } = $(time).data()
      $(time).text(calcDeadline(seconds, stamp))
    })
  }, 1000)

  // Загрузка заявок
  lobbiSocket.emit('game.games', (res) => {
    if (res.status != 0) {
      return alert(res.msg)
    }

    const { games } = res

    // Вывожу игры на страницу
    games.forEach((g) => showGame(g))
  })

  // Открытие формы новой заявки
  makeGameBtn.click(function () {
    makeGameForm.modal('show')
  })

  // Удаление заявки
  lobbiSocket.on('game.remove', (id) => {
    if (
      $(`.game-item[data-id=${id}] .player[data-username=${username}]`)
        .length == 1
    ) {
      $('body').removeClass('inGame')
    }
    $(`.game-item[data-id=${id}]`).remove()
  })

  // Игрок прыгнул в заявку
  lobbiSocket.on('game.player.add', (gameId, player) => {
    const game = $(`.game-item[data-id=${gameId}]`)
    if (!game) return

    // Показываю игрока в заявке
    $('#gamePlayerTmpl')
      .tmpl({ player: { account: player }, id: gameId })
      .appendTo(game.find('.players'))

    // Если текущий игрок, скрываю кнопки
    if (player.username == username) {
      $('body').addClass('inGame')
      game.find('.btn-from-game').removeClass('hide')
    }

    const cnt = game.find('.player').length
    game.find('.players-count .cnt').text(cnt)
  })

  lobbiSocket.on('game.new', (game) => {
    showGame(game)
  })

  lobbiSocket.on('game.player.leave', (gameId, leaveUserName) => {
    const game = $(`.game-item[data-id=${gameId}]`)
    if (!game) return

    const player = game.find(`.player[data-username=${leaveUserName}]`)
    if (!player) return
    player.remove()

    if (leaveUserName == username) {
      game.find('.btn-from-game').hide()
    }

    const cnt = game.find('.player').length
    game.find('.players-count .cnt').text(cnt)
  })

  onlineSocket.on('offline', (user) => {
    const u = $(`.player[data-username=${user.username}]`)
    if (!u) return
    u.find('.friend-avatar').removeClass('online')
  })

  onlineSocket.on('online', (user) => {
    const u = $(`.player[data-username=${user.username}]`)
    if (!u) return
    u.find('.friend-avatar').addClass('online')
  })

  // Вывести игру на страницу
  function showGame(game) {
    // Проверяю, находится ли текущий игрок в заявке
    game.inGame = false
    game.my = false
    if (
      game.gameplayers.filter((gp) => gp.account.username == username).length ==
      1
    ) {
      game.inGame = true
      $('body').addClass('inGame')

      // Проверяю, создал ли игрок эту заявку
      if (game.account.username == username) game.my = true
    }

    gameItemTmpl.tmpl(game).prependTo(gamesList)

    activateBSTooltips()
  }

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
        showGame(game)
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

  // Удалить зявку
  gamesList.on('click', '.btn-remove-game', function () {
    const { id } = $(this).data()
    confirm('Удалить заявку?').then((accept) => {
      if (!accept) return

      lobbiSocket.emit('game.remove', id, (res) => {
        if (res.status != 0) {
          alert(res.msg)
        }
      })
    })
  })

  // Покинуть зявку
  gamesList.on('click', '.btn-from-game', function () {
    const { id } = $(this).data()
    confirm('Покинуть заявку?').then((accept) => {
      if (!accept) return

      lobbiSocket.emit('game.leave', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }

        $('body').removeClass('inGame')
        const game = $(`.game-item[data-id=${id}]`)
        game.find(`.btn-from-game`).addClass('hide')
        game.removeClass('my').removeClass('ingame')
      })
    })
  })

  // Удаление игрока из заявки
  gamesList.on('click', '.remove-from-game', function () {
    const { gameid, username } = $(this).data()

    confirm(`Удалить из заявки игрока ${username}?`).then((accept) => {
      if (!accept) return

      lobbiSocket.emit('game.player.remove', gameid, username, (res) => {
        if (res.status != 0) {
          alert(res.msg)
        }
      })
    })
  })
})
