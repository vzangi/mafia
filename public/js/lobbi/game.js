$(function () {
  const makeGameBtn = $('.btn-make-game')
  const makeGameForm = $('#makeForm')
  const gamesList = $('.games-list')
  const gameItemTmpl = $('#gameItemTmpl')
  const username = $('.user-nik').text().trim()

  // На мобильных утройствах делаю список режимов скрываемым
  $(window).resize(function () {
    if (window.innerWidth < 620) {
      $('.game-types-list').addClass('can-sliding')
      if ($('.game-settings.active').length == 1) {
        $('.game-types-list').slideUp()
      }
    } else {
      if ($('.game-types-list').hasClass('can-sliding')) {
        $('.game-types-list').removeClass('can-sliding')
        $('.game-types-list').slideDown()
      }
    }
  })

  $(window).resize()

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

    game.find('.btn-from-game').show()

    const cnt = game.find('.player').length
    game.find('.players-count .cnt').text(cnt)
  })

  // Создана новая заявка
  lobbiSocket.on('game.new', (game) => {
    showGame(game)
  })

  // Игрок покинл заявку
  lobbiSocket.on('game.player.leave', (gameId, leaveUserName) => {
    const game = $(`.game-item[data-id=${gameId}]`)
    if (!game) return

    const player = game.find(`.player[data-username=${leaveUserName}]`)
    if (!player) return
    player.remove()

    if (leaveUserName == username) {
      game.find('.btn-from-game').hide()
      $('body').removeClass('inGame')
      game.find(`.btn-from-game`).addClass('hide')
      game.removeClass('my').removeClass('ingame')
    }

    const cnt = game.find('.player').length
    game.find('.players-count .cnt').text(cnt)
  })

  // Игрок вышел в оффлайн
  onlineSocket.on('offline', (user) => {
    const u = $(`.player[data-username=${user.username}]`)
    if (!u) return
    u.find('.friend-avatar').removeClass('online')
  })

  // Игрок вошёл на сайт
  onlineSocket.on('online', (user) => {
    const u = $(`.player[data-username=${user.username}]`)
    if (!u) return
    u.find('.friend-avatar').addClass('online')
  })

  // Вывести игру на страницу
  function showGame(game) {
    game.inGame = false
    game.my = false
    // Проверяю, находится ли текущий игрок в заявке
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
          if (playersCount > 20) $('#gamePlayersCount').val(20)
          if (playersCount < 6) $('#gamePlayersCount').val(6)

          if (waitingTime > 20) $('#waitingTime').val(20)
          if (waitingTime < 1) $('#waitingTime').val(1)
          return alert(res.msg)
        }

        const { game } = res
        showGame(game)
      }
    )
  })

  // Создание заявки в классическом режиме
  $('.btn-make-type-1').click(function () {
    const typeId = 1
    const waitingTime = $('#waitingTime-1').val()
    const playersCount = $('#gamePlayersCount-1').val()
    const description = $('#gameDescription-1').val()

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
          if (playersCount > 20) $('#gamePlayersCount-1').val(20)
          if (playersCount < 6) $('#gamePlayersCount-1').val(6)

          if (waitingTime > 20) $('#waitingTime-1').val(20)
          if (waitingTime < 1) $('#waitingTime-1').val(1)
          return alert(res.msg)
        }

        const { game } = res
        showGame(game)
      }
    )
  })

  // Создание заявки в режиме перестрелки
  $('.btn-make-type-2').click(function () {
    const typeId = 2
    const waitingTime = $('#waitingTime-2').val()
    const playersCount = $('#gamePlayersCount-2').val()
    const description = $('#gameDescription-2').val()

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
          if (playersCount > 20) $('#gamePlayersCount-2').val(20)
          if (playersCount < 6) $('#gamePlayersCount-2').val(6)

          if (waitingTime > 20) $('#waitingTime-2').val(20)
          if (waitingTime < 1) $('#waitingTime-2').val(1)
          return alert(res.msg)
        }

        const { game } = res
        showGame(game)
      }
    )
  })

  $('.btn-make-type-3').click(function () {
    alert('Пока недоступно')
  })

  // Создание заявки в мультиролевом режиме
  $('.btn-make-type-4').click(function () {
    const typeId = 4
    const waitingTime = $('#waitingTime-4').val()
    const playersCount = $('#gamePlayersCount-4').val()
    const description = $('#gameDescription-4').val()

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
          if (playersCount > 20) $('#gamePlayersCount-4').val(20)
          if (playersCount < 3) $('#gamePlayersCount-4').val(3)

          if (waitingTime > 20) $('#waitingTime-4').val(20)
          if (waitingTime < 1) $('#waitingTime-4').val(1)
          return alert(res.msg)
        }

        const { game } = res
        showGame(game)
      }
    )
  })

  // Выбор режима
  $('.game-type-item').click(function () {
    if ($(this).hasClass('active')) return
    $('.game-type-item').removeClass('active')
    $(this).addClass('active')

    const { id } = $(this).data()

    $('.welkome-game').slideUp()

    setTimeout(() => {
      $('.welkome-game').remove()
    }, 300)

    $('.game-settings.active').slideUp()
    setTimeout(() => $('.game-settings.active').removeClass('active'), 300)

    $('.game-types-list.can-sliding').slideUp()

    $(`.game-settings[data-id=${id}]`).slideDown()
    setTimeout(() => $(`.game-settings[data-id=${id}]`).addClass('active'), 300)
  })

  // Вернуться к списку режимов
  $('.gs-back').click(function () {
    const gs = $('.game-settings.active')
    gs.slideUp()

    setTimeout(() => gs.removeClass('active'), 300)

    $('.game-type-item').removeClass('active')
    $('.game-types-list').slideDown()
  })

  // Присоединиться к заявке
  gamesList.on('click', '.btn-to-game', function () {
    const btn = this
    setTimeout(() => $(btn).tooltip('hide'))

    const { id } = $(this).data()
    lobbiSocket.emit('game.to', id, (res) => {
      if (res.status != 0) {
        return alert(res.msg)
      }
    })
  })

  // Удалить зявку
  gamesList.on('click', '.btn-remove-game', function () {
    const btn = this
    setTimeout(() => $(btn).tooltip('hide'))

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
    const btn = this
    setTimeout(() => $(btn).tooltip('hide'))

    const { id } = $(this).data()
    confirm('Покинуть заявку?').then((accept) => {
      if (!accept) return

      lobbiSocket.emit('game.leave', id, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }
      })
    })
  })

  // Удаление игрока из заявки
  gamesList.on('click', '.remove-from-game', function () {
    const btn = this
    setTimeout(() => $(btn).tooltip('hide'))

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
