$(function () {
  $('.btn-make-game').click(function () {
    $('#makeForm').modal('show')
  })

  lobbiSocket.on('game.remove', (id) => {
    $(`.game[data-id=${id}]`).remove()
  })

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
      }
    )
  })
})
