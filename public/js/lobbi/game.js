$(function () {
	const makeGameBtn = $('.btn-make-game')
	const makeGameForm = $('#makeForm')
	const gamesList = $('.games-list')
	const gameItemTmpl = $('#gameItemTmpl')
	const username = $('.user-nik').text().trim()
	let newGameMutex = false

	// На мобильных утройствах делаю список режимов скрываемым
	$(window).resize(function () {
		if (window.innerWidth < 620) {
			$('.game-types-list').addClass('can-sliding')
			if ($('.game-settings.active').length == 1) {
				$('.game-types-list').slideUp()
			}
		} else {
			if ($('.game-types-list').hasClass('can-sliding')) {
				$('.game-types-list').removeClass('can-sliding')
				$('.game-types-list').slideDown()
			}
		}
	})

	$(window).resize()

	// Функция пересчёта времени дедлайна заявки
	const calcDeadline = (seconds, stamp) => {
		const totalSeconds = seconds + stamp / 1000 - Date.now() / 1000
		if (totalSeconds < 60) {
			return `${Math.ceil(totalSeconds >= 0 ? totalSeconds : 0)} сек.`
		}
		return `${Math.ceil(totalSeconds / 60)} мин.`
	}

	// Интервал для пересчёта времени жизни заявки
	setInterval(() => {
		$('.waithing-time').each((_, time) => {
			const { seconds, stamp } = $(time).data()
			if (!seconds) return
			$(time).text(calcDeadline(seconds, stamp))
		})
	}, 1000)

	// Интервал подчищающий зявки, которые не были удалены по какой-либо причине (пропал инет и т.д.)
	setInterval(() => {
		$('.game-item').each((_, game) => {
			const time = $(game).find('.waithing-time').text()
			if (time == '0 сек.') {
				if ($(game).hasClass('ingame')) {
					$('body').removeClass('inGame')
				}
				if ($(game).parent().hasClass('contest-box')) {
					$('body').removeClass('inGame')
					$('.contest-box').addClass('hide')

					$('.contest-box .game-item .waithing-time').data().seconds = ''
					$('.contest-box .game-item .waithing-time').text('20 мин.')
				} else {
					$(game).remove()
				}
			}
		})
	}, 500)

	// Загрузка заявок
	lobbiSocket.emit('game.games', (res) => {
		if (res.status != 0) {
			return alert(res.msg)
		}

		const { games, incontest, concount } = res.data

		if (incontest) {
			$('.contest-box .game-item .waithing-time').data().stamp = Date.now()
			$('.contest-box .game-item .waithing-time').data().seconds =
				incontest.time

			$('body').addClass('inGame')
			$('.contest-box').removeClass('hide')
		}

		$('.concnt').text(concount)

		// Вывожу игры на страницу
		games.forEach((g) => showGame(g))
	})

	lobbiSocket.on('update.concount', (concount) => {
		$('.concnt').text(concount)
	})

	// Открытие формы новой заявки
	makeGameBtn.click(function () {
		makeGameForm.modal('show')
	})

	// Удаление заявки
	lobbiSocket.on('game.remove', (id) => {
		if (
			$(`.game-item[data-id=${id}] .player[data-username='${username}']`)
				.length == 1
		) {
			$('body').removeClass('inGame')
		}
		$(`.game-item[data-id=${id}]`).remove()
	})

	// Запуск игры
	lobbiSocket.on('game.start', (id) => {
		$(`.game-item[data-id=${id}]`).remove()
	})

	// Переход в игру
	lobbiSocket.on('game.play', (id) => {
		location.href = `/game/${id}`
	})

	// Игрок прыгнул в заявку
	lobbiSocket.on('game.player.add', (gameId, player) => {
		const game = $(`.game-item[data-id=${gameId}]`)
		if (!game) return

		// Показываю игрока в заявке
		$('#gamePlayerTmpl')
			.tmpl({ player: { account: player }, id: gameId })
			.appendTo(game.find('.players'))

		// Если текущий игрок, скрываю кнопки
		if (player.username == username) {
			$('body').addClass('inGame')
			game.find('.btn-from-game').removeClass('hide')
			game.find('.btn-from-game').show()
		}

		const cnt = game.find('.player').length
		game.find('.players-count .cnt').text(cnt)
	})

	// Создана новая заявка
	lobbiSocket.on('game.new', (game) => {
		showGame(game)
	})

	// Игрок покинул заявку
	lobbiSocket.on('game.player.leave', (gameId, leaveUserName) => {
		const game = $(`.game-item[data-id=${gameId}]`)
		if (!game) return

		const player = game.find(`.player[data-username='${leaveUserName}']`)
		if (!player) return
		player.remove()

		if (leaveUserName == username) {
			game.find('.btn-from-game').hide()
			$('body').removeClass('inGame')
			game.find(`.btn-from-game`).addClass('hide')
			game.removeClass('my').removeClass('ingame')
		}

		const cnt = game.find('.player').length
		game.find('.players-count .cnt').text(cnt)
	})

	// Создание заявки на сорев
	lobbiSocket.on('make.contest', () => {
		$('.contest-box .game-item .waithing-time').data().stamp = Date.now()
		$('.contest-box .game-item .waithing-time').data().seconds = 1200

		$('body').addClass('inGame')
		$('.contest-box').removeClass('hide')
	})

	// Удаление заявки на сорев
	lobbiSocket.on('leave.contest', () => {
		$('body').removeClass('inGame')
		$('.contest-box').addClass('hide')
	})

	// Игрок вышел в оффлайн
	onlineSocket.on('offline', (user) => {
		const u = $(`.player[data-username='${user.username}']`)
		if (!u) return
		u.find('.friend-avatar').removeClass('online')
	})

	// Игрок вошёл на сайт
	onlineSocket.on('online', (user) => {
		const u = $(`.player[data-username='${user.username}']`)
		if (!u) return
		u.find('.friend-avatar').addClass('online')
	})

	// Вывести игру на страницу
	function showGame(game) {
		game.inGame = false
		game.my = false
		// Проверяю, находится ли текущий игрок в заявке
		if (
			game.players.filter((gp) => gp.account.username == username).length == 1
		) {
			game.inGame = true
			$('body').addClass('inGame')

			// Проверяю, создал ли игрок эту заявку
			if (game.account.username == username) game.my = true
		}

		gameItemTmpl.tmpl(game).prependTo(gamesList)

		activateBSTooltips()
	}

	// Создание заявки
	$('.btn-create').click(function () {
		const gametypeId = $('#gameType').val()
		const waitingTime = $('#waitingTime').val()
		const playersCount = $('#gamePlayersCount').val()
		const description = $('#gameDescription').val()

		// Ставлю мутекс
		if (newGameMutex) return
		newGameMutex = true

		// Запрос на создание игры
		lobbiSocket.emit(
			'game.make',
			gametypeId,
			playersCount,
			waitingTime,
			description,
			(res) => {
				newGameMutex = false
				if (res.status != 0) {
					if (playersCount > 20) $('#gamePlayersCount').val(20)
					if (playersCount < 6) $('#gamePlayersCount').val(6)

					if (waitingTime > 20) $('#waitingTime').val(20)
					if (waitingTime < 1) $('#waitingTime').val(1)
					return alert(res.msg)
				}

				const { game } = res
				showGame(game)
			}
		)
	})

	// Создание заявки в классическом режиме
	$('.btn-make-type-1').click(function () {
		const data = {}
		data.gametypeId = 1
		data.waitingTime = $('#waitingTime-1').text()
		data.playersCount = $('#gamePlayersCount-1').text()
		data.mode = $('#mode-1')[0].checked ? 2 : 1
		data.description = $('#gameDescription-1').val()
		data.autostart = true
		if ($('#autostart-1').length == 1)
			data.autostart = $('#autostart-1')[0].checked ? 1 : 0

		// Ставлю мутекс
		if (newGameMutex) return
		newGameMutex = true

		// Запрос на создание игры
		lobbiSocket.emit('game.make', data, (res) => {
			newGameMutex = false
			if (res.status != 0) {
				if (data.playersCount > 20) $('#gamePlayersCount-1').text(20)
				if (data.playersCount < 6) $('#gamePlayersCount-1').text(6)

				if (data.waitingTime > 20) $('#waitingTime-1').text(20)
				if (data.waitingTime < 1) $('#waitingTime-1').text(1)
				return alert(res.msg)
			}

			const { game } = res
			showGame(game)
		})
	})

	// Создание заявки в режиме перестрелки
	$('.btn-make-type-2').click(function () {
		const data = {}
		data.gametypeId = 2
		data.waitingTime = $('#waitingTime-2').text()
		data.playersCount = $('#gamePlayersCount-2').text()
		data.description = $('#gameDescription-2').val()
		data.mode = $('#mode-2')[0].checked ? 2 : 1
		data.melee = $('#melee-2')[0].checked
		data.autostart = true
		if ($('#autostart-2').length == 1)
			data.autostart = $('#autostart-2')[0].checked ? 1 : 0

		// Ставлю мутекс
		if (newGameMutex) return
		newGameMutex = true

		// Запрос на создание игры
		lobbiSocket.emit('game.make', data, (res) => {
			newGameMutex = false
			if (res.status != 0) {
				if (data.playersCount > 20) $('#gamePlayersCount-2').text(20)
				if (data.playersCount < 6) $('#gamePlayersCount-2').text(6)

				if (data.waitingTime > 20) $('#waitingTime-2').text(20)
				if (data.waitingTime < 1) $('#waitingTime-2').text(1)
				return alert(res.msg)
			}

			const { game } = res
			showGame(game)
		})
	})

	// Присоедениться к очереди на соревновательную игру
	$('.btn-make-type-3').click(function () {
		const data = {}

		const selcontests = $('.contests-box input:checked')

		if (selcontests.length < 2) {
			return alert(
				'Чтобы сыграть, нужно выбрать как минимум два из предложенных вариантов'
			)
		}

		// Беру id выбранных типов игр
		data.contests = selcontests
			.map((_, c) => c.id.replace('contest-', '') * 1)
			.get()

		// Ставлю мутекс
		if (newGameMutex) return
		newGameMutex = true

		// Запрос на создание игры
		lobbiSocket.emit('game.contests', data, (res) => {
			newGameMutex = false
			if (res.status != 0) {
				return alert(res.msg)
			}
		})
	})

	// Создание заявки в мультиролевом режиме
	$('.btn-make-type-4').click(function () {
		const data = {}
		data.gametypeId = 4
		data.waitingTime = $('#waitingTime-4').text()
		data.playersCount = $('#gamePlayersCount-4').text()
		data.mode = $('#mode-4')[0].checked ? 2 : 1
		data.description = $('#gameDescription-4').val()
		data.autostart = true
		if ($('#autostart-4').length == 1)
			data.autostart = $('#autostart-4')[0].checked ? 1 : 0

		// Ставлю мутекс
		if (newGameMutex) return
		newGameMutex = true

		// Запрос на создание игры
		lobbiSocket.emit('game.make', data, (res) => {
			newGameMutex = false
			if (res.status != 0) {
				if (data.playersCount > 20) $('#gamePlayersCount-4').val(20)
				if (data.playersCount < 3) $('#gamePlayersCount-4').val(3)

				if (data.waitingTime > 20) $('#waitingTime-4').val(20)
				if (data.waitingTime < 1) $('#waitingTime-4').val(1)
				return alert(res.msg)
			}

			const { game } = res
			showGame(game)
		})
	})

	// Создание заявки в конструкторе
	$('.btn-make-type-5').click(function () {
		const data = {}
		data.gametypeId = 5
		data.waitingTime = $('#waitingTime-5').text() * 1
		data.playersCount = $('#gamePlayersCount-5').text() * 1
		data.mode = $('#mode-5')[0].checked ? 2 : 1
		data.description = $('#gameDescription-5').val()
		data.autostart = true
		if ($('#autostart-5').length == 1)
			data.autostart = $('#autostart-5')[0].checked ? 1 : 0

		data.roles = []

		// Мафия
		const mafiaCount = $('#mafiaCount-5').text() * 1
		data.roles.push([2, mafiaCount])

		// Комиссар
		if ($('#komissar-5')[0].checked) {
			data.roles.push([3, 1])
		}

		// Сержант
		if ($('#sergeant-5')[0].checked) {
			if (!$('#komissar-5')[0].checked) {
				return alert('Сержант не может быть в игре без комиссара')
			}

			data.roles.push([4, 1])
		}

		// Доктор
		if ($('#doctor-5')[0].checked) {
			data.roles.push([5, 1])
		}

		// Маньяк
		const maniacCount = $('#maniacCount-5').text() * 1
		if (maniacCount != 0) {
			data.roles.push([6, maniacCount])
		}

		// Дитя
		if ($('#child-5')[0].checked) {
			data.roles.push([7, 1])
		}

		// Адвокат
		if ($('#advocate-5')[0].checked) {
			data.roles.push([8, 1])
		}

		// Любовница
		if ($('#lover-5')[0].checked) {
			data.roles.push([9, 1])
		}

		const totalRolesCount = data.roles.reduce((a, b) => a + b[1], 0)

		if (totalRolesCount > data.playersCount) {
			return alert('Количество ролей больше количества игроков')
		}

		// Ставлю мутекс
		if (newGameMutex) return
		newGameMutex = true

		// Запрос на создание игры
		lobbiSocket.emit('game.make', data, (res) => {
			newGameMutex = false
			if (res.status != 0) {
				if (data.playersCount > 20) $('#gamePlayersCount-5').val(20)
				if (data.playersCount < 3) $('#gamePlayersCount-5').val(3)

				if (data.waitingTime > 20) $('#waitingTime-5').val(20)
				if (data.waitingTime < 1) $('#waitingTime-5').val(1)
				return alert(res.msg)
			}

			const { game } = res
			showGame(game)
		})
	})

	// Выбор режима
	$('.game-type-item').click(function () {
		if ($(this).hasClass('active')) return
		$('.game-type-item').removeClass('active')
		$(this).addClass('active')

		const { id } = $(this).data()

		$('.welkome-game').slideUp()

		setTimeout(() => {
			$('.welkome-game').remove()
		}, 300)

		$('.game-settings.active').slideUp()
		setTimeout(() => $('.game-settings.active').removeClass('active'), 300)

		$('.game-types-list.can-sliding').slideUp()

		$(`.game-settings[data-id=${id}]`).slideDown()
		setTimeout(() => $(`.game-settings[data-id=${id}]`).addClass('active'), 300)
	})

	// Вернуться к списку режимов
	$('.gs-back').click(function () {
		const gs = $('.game-settings.active')
		gs.slideUp()

		setTimeout(() => gs.removeClass('active'), 300)

		$('.game-type-item').removeClass('active')
		$('.game-types-list').slideDown()
	})

	// Нажатие на кнопки инпута (больше или меньше)
	$('.number-input-box .btn').click(function () {
		const btn = $(this)
		const input = btn.parent().find('.form-control')
		const { min, max } = input.data()
		let val = input.text() * 1
		if (btn.hasClass('btn-less')) {
			if (val == min) return
			val -= 1
			input.text(val)
			if (val == min) {
				btn.removeClass('btn-success').addClass('btn-dark')
			} else {
				btn
					.parent()
					.find('.btn')
					.removeClass('btn-dark')
					.addClass('btn-success')
			}
		}
		if (btn.hasClass('btn-more')) {
			if (val == max) return
			val += 1
			input.text(val)
			if (val == max) {
				btn.removeClass('btn-success').addClass('btn-dark')
			} else {
				btn
					.parent()
					.find('.btn')
					.removeClass('btn-dark')
					.addClass('btn-success')
			}
		}
	})

	// Присоединиться к заявке
	gamesList.on('click', '.btn-to-game', function () {
		const btn = this

		if ($(btn).hasClass('disabled')) return
		$(btn).addClass('disabled')

		setTimeout(() => $(btn).tooltip('hide'))

		setTimeout(() => $(btn).removeClass('disabled'), 1000)

		const { id } = $(btn).data()
		lobbiSocket.emit('game.to', id, (res) => {
			if (res.status != 0) {
				return alert(res.msg)
			}
		})
	})

	// Удалить зявку
	gamesList.on('click', '.btn-remove-game', function () {
		const btn = this
		setTimeout(() => $(btn).tooltip('hide'))

		const { id } = $(this).data()
		confirm('Удалить заявку?').then((accept) => {
			if (!accept) return

			lobbiSocket.emit('game.remove', id, (res) => {
				if (res.status != 0) {
					alert(res.msg)
				}
			})
		})
	})

	// Покинуть зявку
	gamesList.on('click', '.btn-from-game', function () {
		const btn = this
		setTimeout(() => $(btn).tooltip('hide'))

		const { id } = $(this).data()
		confirm('Покинуть заявку?').then((accept) => {
			if (!accept) return

			lobbiSocket.emit('game.leave', id, (res) => {
				if (res.status != 0) {
					return alert(res.msg)
				}
			})
		})
	})

	// Удаление игрока из заявки
	gamesList.on('click', '.remove-from-game', function () {
		const btn = this
		setTimeout(() => $(btn).tooltip('hide'))

		const { gameid, username } = $(this).data()

		confirm(`Удалить из заявки игрока ${username}?`).then((accept) => {
			if (!accept) return

			lobbiSocket.emit('game.player.remove', gameid, username, (res) => {
				if (res.status != 0) {
					alert(res.msg)
				}
			})
		})
	})

	// Запуск игры в ручном режиме
	gamesList.on('click', '.btn-play-game', function () {
		const { id } = $(this).data()
		confirm('Запустить игру?').then((accept) => {
			if (!accept) return
			lobbiSocket.emit('game.start', id, (res) => {
				const { status, msg } = res
				if (status != 0) return alert(msg)
			})
		})
	})

	$('.btn-leave-contest').click(function () {
		confirm('Покинуть очередь?').then((accept) => {
			if (!accept) return

			lobbiSocket.emit('game.leave.contest', (res) => {
				const { status, msg } = res
				if (status != 0) return alert(msg)

				$('.contest-box .game-item .waithing-time').data().seconds = ''
				$('.contest-box .game-item .waithing-time').text('20 мин.')

				$('body').removeClass('inGame')
				$('.contest-box').addClass('hide')
			})
		})
	})
})
