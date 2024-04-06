$(function () {
	const filterInput = $('#filter')

	const onlineSocket = io('/online')

	onlineSocket.on('online', (account) => {
		if ($(`.friend-box[data-nik='${account.username}']`).length != 0) return
		$('#onlineUserTmpl').tmpl(account).prependTo('.users-list')
		activateBSTooltips()
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
