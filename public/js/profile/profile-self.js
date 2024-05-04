$(function () {
	$('.gifts-list').on('contextmenu', '.gift-item', function () {
		const { id } = $(this).data()
		confirm('Удалить открытку?').then((answer) => {
			if (answer) {
				socket.emit('gifts.remove', id, (res) => {
					if (res.status == 0) {
						$(`.gift-item[data-id=${id}]`).remove()
					}
				})
			}
		})
		return false
	})

	$('.add-about').click(function () {
		prompt('Напишите немного о себе').then((aboutText) => {
			if (!aboutText) return
			if (aboutText.trim() == '') return
			socket.emit('profile.about.change', aboutText, (res) => {
				const { status, msg } = res
				if (status != 0) return alert(msg)
				location.reload()
			})
		})
	})

	$('.change-about').click(function () {
		const about = $('.about-text')
		const text = about.length > 0 ? about.text() : ''

		prompt('Напишите немного о себе').then((aboutText) => {
			if (!aboutText) return
			if (aboutText.trim() == '') return
			socket.emit('profile.about.change', aboutText, (res) => {
				const { status, msg, data } = res
				if (status != 0) return alert(msg)
				about.text(data.value)
			})
		})

		setTimeout(() => {
			$('#bs_modal_form input').val(text)
		}, 500)
	})
})
