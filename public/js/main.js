// Установка количества запросов в друзья и красной точки на аватарке
const setCount = (count, cls = '') => {
  if (count == 0) {
    $(`a>span.cnt${cls}`).text(count).addClass('hide')
    $('.h-image-box').removeClass('has-notify')
  } else {
    $(`a>span.cnt${cls}`)
      .text(count)
      .removeClass('hide')
      .parent()
      .removeClass('hide')
    $('.h-image-box').addClass('has-notify')
  }
}

$(function () {
  // Получение количества запросов в друзья
  socket.emit('friends.request.count', (res) => {
    if (res.status != 0) return
    setCount(res.count, '.friend-request-count')
  })

  // При новом запросе в друзья
  socket.on('friend.request', (friendRequestsCount) => {
    setCount(friendRequestsCount, '.friend-request-count')
    playSound(zvuk)
  })

  // Получение количества предложений обмена
  socket.emit('trades.count', (res) => {
    if (res.status != 0) return
    setCount(res.count, '.new-trades-count')
  })

  // При новом предложении обмена
  socket.on('trades.new', (tradesCount) => {
    setCount(tradesCount, '.new-trades-count')
    playSound(zvuk)
  })

  // При получении новой открытки
  socket.on('gifts.notify', (username) => {
    playSound(zvuk)
  })

  // При смене ника
  socket.on('nik.changed', (nik) => {
    location.reload()
  })

  // Отображение нотификации
  const showNotify = (data) => {
    const { id, message, level } = data
    notify(message, 0, level)
    socket.emit('notify.read', id)
  }

  // При новой нотификации
  socket.on('notify', showNotify)

  // Получение новых нотификаций
  socket.emit('notify.list', (res) => {
    if (res.status != 0) return
    const { notifies } = res
    notifies.forEach(showNotify)
  })
})
