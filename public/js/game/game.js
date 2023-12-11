$(function () {
  function startVoting() {
    $('.players-list').removeClass('voted')
    $('.player').removeClass('voted')
    setTimeout(() => $('.vote-dot').show(), 500)

    setTimeout(() => {
      $('.vote-dot').show()
      $('.players-list').addClass('voting')
    }, 1000)
  }

  function stopVoting() {
    $('.players-list').removeClass('voting')
    $('.vote-result').remove()
    setTimeout(() => {
      $('.vote-cnt').text(0)
      $('.vote-dot').hide()
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
    player.find('.vote-dot').remove()
    player.addClass('player-status-5').addClass(`role-${role.id}`)
    $(`<span>${role.name}</span>`).appendTo(player.find('.friend-info'))
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
})
