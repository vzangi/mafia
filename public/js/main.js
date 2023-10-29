$(function () {
  
  const setCount = (count) => {
    if (count == 0) return
    $('a>span.cnt').text(count).removeClass('hide').parent().removeClass('hide')
    $('.h-image-box').addClass('has-notify')
  }

  socket.emit('gifts.count', (res) => {
    if (res.status != 0) return
    if (res.count == 0) return
    $('.h-image-box, .dropdown-box .profile-avatar-image').addClass(
      'has-notify'
    )
  })

  socket.on('gifts.notify', (username) => {
    $('.h-image-box, .dropdown-box .profile-avatar-image').addClass(
      'has-notify'
    )
  })

  socket.on('nik.changed', (nik) => {
    location.reload()
  })

  socket.emit('friends.request.count', (res) => {
    if (res.status != 0) return
    setCount(res.count)
  })

  socket.on('friend.request', (friendRequestsCount) => {
    setCount(friendRequestsCount)
    playSound(zvuk)
  })

  const showNotify = (data) => {
    const { id, message, level } = data
    notify(message, level == 0 ? 7000 : 0, level)
    socket.emit('notify.read', id)
  }

  socket.on('notify', showNotify)

  socket.emit('notify.list', (res) => {
    if (res.status != 0) return
    const { notifies } = res
    notifies.forEach(showNotify)
  })

})
