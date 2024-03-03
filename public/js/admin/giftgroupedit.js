$(function () {
	$('.remove-gift-btn').click(async function () {
		const accept = await confirm('Удалить открытку?')
		if (!accept) return
		const { id } = $(this).data()

		$.ajax({
			url: '/gift/remove',
			type: 'post',
			data: {
				giftId: id,
			},
			success: function (r) {
				$(`.gifts-list-item[data-id=${id}]`).remove()
			},
			error: function (r) {},
		})
	})
})
