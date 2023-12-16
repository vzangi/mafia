$(function () {
  // Начало голосвания
  function startVoting() {
    $('.players-list').removeClass('voted')
    $('.player').removeClass('voted')
    setTimeout(() => $('.vote-dot').removeClass('hide'), 500)

    setTimeout(() => {
      $('.vote-dot').removeClass('hide')
      $('.players-list').addClass('voting')
    }, 1000)
  }

  // Конец голосования
  function stopVoting() {
    $('.players-list').removeClass('voting')
    $('.vote-result').remove()
    setTimeout(() => {
      $('.vote-cnt').text(0)
      $('.vote-dot').addClass('hide')
    }, 300)
  }

  // Начало хода мафии
  function nightBegin() {
    $('.kill-dot').removeClass('hide')
    setTimeout(function () {
      $('body, .players-list').addClass('night')
    }, 10)
  }

  // Конец хода мафии
  function nightEnd() {
    $('body, .players-list').removeClass('night')
    setTimeout(function () {
      $('.kill-dot').addClass('hide').removeClass('checked')
    }, 300)
  }

  gameSocket.on('voting.stop', () => {
    stopVoting()
  })

  gameSocket.on('voting.start', () => {
    startVoting()
  })

  gameSocket.on('mafia.start', () => {
    nightBegin()
  })

  gameSocket.on('mafia.stop', () => {
    nightEnd()
  })

  // Конец игры
  gameSocket.on('game.over', (side) => {
    $('.input-box').remove()
    $('.vote-dot').remove()
    $('.to-lobbi').removeClass('hide')
  })

  // Отображение раскрытой роли 
  gameSocket.on('role.show', (user) => {
    const player = $(`.player[data-username=${user.username}]`)
    player.find('.vote-dot').remove()
    player.find('.kill-dot').remove()
    player.addClass(`player-status-${user.status}`).addClass(`role-${user.role.id}`)
    $(`<span>${user.role.name}</span>`).appendTo(player.find('.friend-info'))

    // Если посадили текущего игрока
    if (user.username == getMyNik()) {
      $('.input-box').remove()
      $('.to-lobbi').removeClass('hide')
      $('.kill-dot').remove()
    }
  })

  // Получение ника текущего игрока   
  function getMyNik() {
    const iam = $('.player.iam')
    if (iam.length != 1) return ''
    return iam.data().username
  }

  // Голосование
  $('.vote-dot').click(function () {
    const { username } = $(this).data()
    if (username == getMyNik()) return

    if ($(`.iam.voted`).length == 1) return

    gameSocket.emit('vote', username)
  })

  // Проверка
  $('.prova-dot').click(function () {
    const { username } = $(this).data()
    gameSocket.emit('prova', username)
  })

  // Голос
  gameSocket.on('vote', (voterUsername, playerUsername) => {
    console.log(voterUsername, playerUsername)

    // Увеличиваю количество голосов
    const dot = $(`.vote-dot[data-username=${playerUsername}] .vote-cnt`)
    const cnt = dot.text() * 1
    dot.text(cnt + 1)

    // Меняю статус голосовавшего
    const voter = $(`.player[data-username=${voterUsername}]`)
    voter.addClass('voted')
    $('#voteResultTmpl')
      .tmpl({ vote: playerUsername })
      .appendTo(voter.find('.friend-info'))
  })

  // Выстрел
  $('.kill-dot').click(function () {
    if (myRole.id != 2) return

    const { username } = $(this).data()
    $(this).addClass('checked')

    gameSocket.emit('shot', username)

    $('.kill-dot:not(.checked)').addClass('hide')
  })
})
