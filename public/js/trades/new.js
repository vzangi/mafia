$(function () {
	// При нажатии на трейдера показываю его вещи
	$('.trader').click(function () {
		const { id } = $(this).data()

		$('.trader').removeClass('active')
		$(this).addClass('active')

		$('.trader-things').addClass('hide')
		$(`.trader-things[data-trader=${id}]`).removeClass('hide')
	})

	// Отправляет вещь в список обмена
	$('.things-box').on('click', '.thing-item', function () {
		const { trader } = $(this).data()
		const offerList = $(`.offer .things-list[data-id='${trader}']`)
		offerList.prev().hide()
		$(this).remove().appendTo(offerList)
		$('.send-offer-btn').removeAttr('disabled')
	})

	// Возвращает вещь из списка обмена
	$('.offer').on('click', '.thing-item', function () {
		const { trader } = $(this).data()
		const offerList = $(`.offer .things-list[data-id='${trader}']`)
		const traderThingsList = $(
			`.trader-things[data-trader='${trader}'] .things-list`
		)

		$(this).remove().appendTo(traderThingsList)

		if (offerList.find('.thins-items').length == 0) {
			offerList.prev().show()
		}

		if ($('.offer .thing-item').length == 0) {
			$('.send-offer-btn').attr('disabled', '')
		}

		$('.sort-box select').change()
		$('.type-box select').change()
		$('.filter-box input').keyup()
	})

	// Фильтрация по типу вещи
	$('.type-box select').change(function () {
		const typeId = $(this).val()
		const items = $('.trader-things .thing-item')

		items.removeClass('hide-item')

		if (typeId == 0) return

		items
			.filter((_, item) => $(item).data().thing.thing.thingtypeId != typeId)
			.addClass('hide-item')
	})

	// Cортировка вещей
	$('.sort-box select').change(function () {
		const sortBy = $(this).val()

		const fSort = (a, b) => {
			const ta = $(a).data().thing
			const tb = $(b).data().thing

			// По умолчанию
			if (sortBy == 0) {
				if (ta.id > tb.id) return -1
				if (ta.id < tb.id) return 1
				return 0
			}

			// По имени
			if (sortBy == 1) {
				if (ta.thing.name > tb.thing.name) return 1
				if (ta.thing.name < tb.thing.name) return -1
				return 0
			}

			// По классу
			if (sortBy == 2) {
				if (ta.thing.thingclassId > tb.thing.thingclassId) return -1
				if (ta.thing.thingclassId < tb.thing.thingclassId) return 1
				return 0
			}

			// По типу
			if (sortBy == 3) {
				if (ta.thing.thingtypeId > tb.thing.thingtypeId) return 1
				if (ta.thing.thingtypeId < tb.thing.thingtypeId) return -1
				return 0
			}

			// По дате
			if (sortBy == 4) {
				if (ta.updatedAt > tb.updatedAt) return 1
				if (ta.updatedAt < tb.updatedAt) return -1
				return 0
			}
		}

		const myItems = $('.trader-things:first .thing-item')

		const mySortedItems = myItems.sort(fSort)

		for (let item of mySortedItems) {
			$(item).remove().appendTo('.trader-things:first .things-list')
		}

		const vizaviItems = $('.trader-things:last .thing-item')

		const vizaviSortedItems = vizaviItems.sort(fSort)

		for (let item of vizaviSortedItems) {
			$(item).remove().appendTo('.trader-things:last .things-list')
		}
	})

	// Фильтрация по имени
	$('.filter-box input').keyup(function () {
		const filterText = $(this).val().toLowerCase()
		const items = $('.trader-things .thing-item')

		items
			.show()
			.filter(
				(_, item) =>
					$(item).data().thing.thing.name.toLowerCase().indexOf(filterText) < 0
			)
			.hide()
	})

	// Нажатие на кнопку "Отправить предложение"
	$('.send-offer-btn').click(function () {
		const myThingIds = []
		$('.offer .things-list:first .thing-item').each((_, t) =>
			myThingIds.push($(t).data().id)
		)

		const vizaviId = $('.trader:last').data().id
		const vizaviThingIds = []
		$('.offer .things-list:last .thing-item').each((_, t) =>
			vizaviThingIds.push($(t).data().id)
		)

		socket.emit('trades.new', vizaviId, myThingIds, vizaviThingIds, (res) => {
			if (res.status != 0) {
				return alert(res.msg)
			}

			$('.offer .thing-item').click()

			alert('Предложение обмена отправлено').then(() => {
				location.href = '/profile/things'
			})
		})
	})

	// Нажатие на "Отменить"
	$('.decline-btn').click(function () {
		const { id } = $(this).data()
		confirm('Отменить обмен?').then((accept) => {
			if (!accept) return

			socket.emit('trades.decline', id, (res) => {
				if (res.status != 0) {
					return alert(res.msg)
				}
				$(`.trade-item[data-id=${id}]`).remove()
				notify('Обмен отменён')
			})
		})
	})
})
