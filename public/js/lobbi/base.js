const lobbiSocket = io('/lobbi')
const onlineSocket = io('/online')

lobbiSocket.on('reload', () => location.reload())

function calcOnline() {
  const total = $('.user-online').text() * 1
  const authed = $(`.users-list .friend-box`).length
  const guests = total - authed
  $('.total-user-count').text(total)
  $('.auth-user-count').text(authed)
  $('.guest-user-count').text(guests)
}
