$(function () {
  function startVoting() {
    $('.players-list').removeClass('voted')
    $('.player').removeClass('voted')
    setTimeout(() => $('.vote-dot').removeClass('hide'), 500)

    setTimeout(() => {
      $('.vote-dot').removeClass('hide')
      $('.players-list').addClass('voting')
    }, 1000)
  }

  function stopVoting() {
    $('.players-list').removeClass('voting')
    $('.vote-result').remove()
    setTimeout(() => {
      $('.vote-cnt').text(0)
      $('.vote-dot').addClass('hide')
    }, 300)
  }

  function nightBegin() {
    $('.kill-dot').removeClass('hide')
    setTimeout(function () {
      $('body, .players-list').addClass('night')
    }, 10)
  }

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

  gameSocket.on('player.prisoned', (playerUsername, role) => {
    const player = $(`.player[data-username=${playerUsername}]`)
    const myNik = $('.player.iam').data().username
    player.find('.vote-dot').remove()
    player.find('.kill-dot').remove()
    player.addClass('player-status-5').addClass(`role-${role.id}`)
    $(`<span>${role.name}</span>`).appendTo(player.find('.friend-info'))

    // Если посадили текущего игрока
    if (playerUsername == myNik) {
      $('.input-box').remove()
      $('.to-lobbi').removeClass('hide')
      $('.kill-dot').remove()
    }
  })

  gameSocket.on('game.over', (side) => {
    $('.input-box').remove()
    $('.vote-dot').remove()
    $('.to-lobbi').removeClass('hide')
  })

  gameSocket.on('mafia.start', () => {
    nightBegin()
  })

  gameSocket.on('mafia.stop', () => {
    nightEnd()
  })

  gameSocket.on('killed', (user) => {
    const player = $(`.player[data-username=${user.username}]`)
    const myNik = $('.player.iam').data().username
    player.find('.vote-dot').remove()
    player.find('.kill-dot').remove()

    player.addClass('player-status-4').addClass(`role-${role.id}`)
    $(`<span>${role.name}</span>`).appendTo(player.find('.friend-info'))

    // Если убили текущего игрока
    if (user.username == myNik) {
      $('.input-box').remove()
      $('.to-lobbi').removeClass('hide')
      $('.kill-dot').remove()
    }
  })

  // Голосование
  $('.vote-dot').click(function () {
    const { username } = $(this).data()
    const myNik = $('.player.iam').data().username
    if (username == myNik) return

    if ($(`.iam.voted`).length == 1) return

    gameSocket.emit('vote', username)
  })

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
