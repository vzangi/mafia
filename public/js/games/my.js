$(function () {
	const from = $('#from').val()
	const to = $('#to').val()
	const gameResult = $('#gameResult').val()
	const userRoles = $('#userRoles').val()
	const action = $('#action').val()
	const fact = $('#fact').val()

	function getGames(req) {
		if (from != '') req.from = from
		if (to != '') req.to = to
		if (gameResult != '') req.gameResult = gameResult
		if (userRoles != '') req.userRoles = userRoles
		if (action != '') req.action = action
		if (fact != '') req.fact = fact

		socket.emit('myarchive', req, (res) => {
			$('.games-list .loader').remove()

			const { status, msg, data } = res
			if (status != 0) return alert(msg)

			const { games, limit } = data

			if (games.length == 0) {
				$('#noGamesTmpl').tmpl().appendTo($('.games-list'))

				return
			}

			for (let index = 0; index < games.length; index++) {
				const { game } = games[index]
				if (index == limit) {
					$('#moreGamesTmpl').tmpl(games[index]).appendTo($('.games-list'))
					continue
				}
				if ($(`.game-item[data-id='${game.id}']`).length == 0)
					$('#gameTmpl').tmpl(game).appendTo($('.games-list'))
			}

			activateBSTooltips()
		})
	}

	getGames({})

	$('.games-list').on('click', '.btn-more', function () {
		const { idless } = $(this).data()
		$(this).parent().slideUp()
		getGames({ idless })
	})
})
