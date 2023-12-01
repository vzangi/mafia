$(function () {
  const filterInput = $('#filter')

  const onlineSocket = io('/online')

  onlineSocket.on('online', (account) => {
    $('#onlineUserTmpl').tmpl(account).prependTo('.users-list')
  })

  onlineSocket.on('offline', (account) => {
    const { username } = account
    $(`[data-nik=${username}`).remove()
  })

  filterInput.keyup(function () {
    const filter = $(this).val()
    $('.online-friend-box').each((_, friend) => {
      if ($(friend).find('.friend-links a').text().indexOf(filter) < 0) {
        $(friend).slideUp()
      } else {
        $(friend).slideDown()
      }
    })
  })
})
