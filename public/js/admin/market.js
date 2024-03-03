$(function () {
	// Фильтрация по названию
	$('#filter').keyup(function () {
		const find = $(this).val()
		if (find == '') {
			$('tbody tr').removeClass('filter-hide')
		} else {
			$(`span.name:not(:contains(${find}))`)
				.parent()
				.parent()
				.addClass('filter-hide')
		}
	})

	// Фильтрация по классу
	$('#class').change(function () {
		const classId = $(this).val()
		if (classId == '') {
			$('tbody tr').removeClass('class-hide')
		} else {
			$('tbody tr').addClass('class-hide')
			$(`tbody tr[data-class=${classId}]`).removeClass('class-hide')
		}
	})

	// Фильтрация по коллекции
	$('#collection').change(function () {
		const collectionId = $(this).val()
		if (collectionId == '') {
			$('tbody tr').removeClass('collection-hide')
		} else {
			$('tbody tr').addClass('collection-hide')
			$(`tbody tr[data-collection=${collectionId}]`).removeClass(
				'collection-hide'
			)
		}
	})

	// Открытие вещи на редактирование
	$('.table').on('click', 'tbody tr', function () {
		const { id } = $(this).data()
		location.href = `/market/things/edit/${id}`
	})

	// Подарок игроку
	$('.table').on('contextmenu', 'tbody tr', function () {
		const { id } = $(this).data()
		prompt('Кому подарить вещь?').then((username) => {
			const data = {
				id,
				username,
			}
			$.ajax({
				type: 'post',
				url: '/market/things/gift',
				data,
				success: function () {
					alert('Вещь подарена')
				},
				error: function (data) {
					alert(data.responseJSON.msg)
				},
			})
		})
		return false
	})
})
