$(function () {
  $('#stopTheGame').click(function () {
    confirm('Остановить партию?').then((accept) => {
      if (!accept) return

      gameSocket.emit('stop')
    })
  })
})
