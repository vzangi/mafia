$(function () {
	const fInput = $('#friendsFilter')
	let timeoutId = null

	fInput.keyup(function () {
		if (timeoutId) clearTimeout(timeoutId)
		const val = fInput.val().toLowerCase()
		timeoutId = setTimeout(() => filter(val), 300)
	})

	function filter(nik) {
		if (nik == '') {
			$('.friend-box').show()
			return
		}

		$('.friend-box').each(function (_, fb) {
			const b = $(fb)
			const { username } = b.data()
			if (username.includes(nik)) b.show()
			else b.hide()
		})
	}
})
