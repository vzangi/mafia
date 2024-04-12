$(function () {
  const filterInput = $('#filter')

  $('.user-online-box').click(function (event) {
    event.preventDefault()
    $('#onlineForm').modal('show')
    return false
  })

  onlineSocket.on('online', (account) => {
    if (
      $(`.users-list .friend-box[data-nik='${account.username}']`).length != 0
    )
      return
    $('#onlineUserTmpl').tmpl(account).prependTo('.users-list')
    filterInput.keyup()
    activateBSTooltips()
  })

  onlineSocket.on('offline', (account) => {
    const { username } = account
    $(`.users-list [data-nik='${username}'`).parent().remove()
  })

  filterInput.keyup(function () {
    const filter = $(this).val().toLowerCase()
    $('.users-list .online-friend-box').each((_, friend) => {
      if (
        $(friend).find('.friend-links a').text().toLowerCase().indexOf(filter) <
        0
      ) {
        $(friend).slideUp()
      } else {
        $(friend).slideDown()
      }
    })
  })
})
