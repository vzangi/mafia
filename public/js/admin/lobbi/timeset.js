$(function () {
	$('.number-input-box').on('click', '.form-control', function () {
		const self = this
		prompt('Введите значение (1-999)').then((value) => {
			if (value * 1 > 999) return
			if (value * 1 < 1) return
			$(self).text(value * 1)
		})
	})
})
