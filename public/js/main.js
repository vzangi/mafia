const socket = io()
let zvuk = new Audio('/sounds/zvuk.mp3')
$('body').append(zvuk)

// Воспроизводит звук на странице
function playSound(sound) {
  setTimeout(function () {
    if (sound.readyState == 4) {
      sound.play()
    } else {
      playSound(sound)
    }
  }, 10)
}

$(function () {
  // Включаем тултипы
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  )
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
  })

  // Действие по нажатию на кнопку
  async function action(btn) {
    const { id, question, event } = $(btn).data()
    if (await confirm(question)) {
      socket.emit(event, id, async (res) => {
        if (res && res.status != 0) {
          return await alert(res.msg)
        }
        location.reload()
      })
    }
  }

  // Кнопки с действиями
  $('.action-btn').click(function () {
    action(this)
  })

  const setCount = (count) => {
    if (count == 0) return
    $('a>span.cnt').text(count).removeClass('hide').parent().removeClass('hide')
    $('.h-image-box').addClass('has-notify')
  }

  socket.emit('friends.request.count', (friendRequestsCount) => {
    setCount(friendRequestsCount)
  })

  socket.on('friend.request', (friendRequestsCount) => {
    setCount(friendRequestsCount)
    playSound(zvuk)
  })
})
