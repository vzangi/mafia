$(function () {
  // Установка количества запросов в друзья и красной точки на аватарке
  const setCount = (count) => {
    if (count == 0) return
    $('a>span.cnt').text(count).removeClass('hide').parent().removeClass('hide')
    $('.h-image-box').addClass('has-notify')
  }

  // Получение количества запросов в друзья
  socket.emit('friends.request.count', (res) => {
    if (res.status != 0) return
    setCount(res.count)
  })

  // При новом запросе в друзья
  socket.on('friend.request', (friendRequestsCount) => {
    setCount(friendRequestsCount)
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
