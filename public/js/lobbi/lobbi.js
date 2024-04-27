$(async function () {
	const userOnlineCount = $('.user-online')
	const chatInput = $('.input-box input')
	const chatSettingsButton = $('.chat-settings > span.gear')
	const chatExpandButton = $('.chat-settings > span.expand')
	const chatBox = $('.chat-box')
	const chat = $('.chat')
	const smilesOpenBtn = $('.smiles')
	const smilesBox = $('.all-smiles')
	const chatSettingsBox = $('.chat-settings-box')
	const chatWhideCheckbox = $('input.chat-whide')
	const chatFixCheckbox = $('input.chat-fix')
	const colorShemeItem = $('.color-sheme')
	const friendsOnlineList = $('.friends-list')
	const fontSizeItem = $('.font-size')
	const userMarkerBegin = '['
	const userMarkerEnd = ']'
	const friendsOnlineFilterInput = $('.friends-online input')

	const userNik = $('.user-nik').text()
	const urlPattern =
		/((http(s)?:\/\/)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.#?&//=]*))/g
	const userTemplate = $('#userTmpl')
	const messageTemplate = $('#messageTmpl')
	const smileTemplate = $('#smileTmpl')
	const linkTemplate = $('#linkTmpl')

	const noFriendsTemplate = $('#noFriendsOnlineTmpl')
	const friendOnlineTemplate = $('#friendOnlineTmpl')

	let smilePattern = ''
	let timeoutTyping
	let typingMutex = false
	let needScroll = localStorage.getItem('needScroll') == '1'
	let wideChat = localStorage.getItem('wideChat') == '1'
	let colorSheme = localStorage.getItem('colorSheme') || 'dark'
	let fontSize = localStorage.getItem('fontSize') || 'font-16'

	localStorage.setItem('input', '')

	chat.addClass(fontSize)
	$(`.font-size[data-font=${fontSize}]`).addClass('active')

	friendsOnlineFilterInput.keyup(function () {
		const filter = $(this).val()
		$('.online-friend-box').each((_, friend) => {
			if ($(friend).find('.friend-info .f-nik').text().indexOf(filter) < 0) {
				$(friend).slideUp()
			} else {
				$(friend).slideDown()
			}
		})
	})

	// Функция загрузки пользователей онлайн
	function updateOnlineUsers() {
		socket.emit('users.online', (res) => {
			const { status, msg, users } = res
			if (status != 0) {
				console.log(msg)
				return
			}

			$('#onlineUserTmpl').tmpl(users).prependTo($('.users-list').empty())
			calcOnline()
		})
	}

	// Событие при получении страницей фокуса
	function onWindowFocus() {
		updateOnlineUsers()
		$(window).one('blur', onWindowBlur)
	}

	// Событие при потере фокуса страницей
	function onWindowBlur() {
		$(window).one('focus', onWindowFocus)
	}

	// Запуск события получения фокуса
	onWindowFocus()

	setTimeout(() => {
		socket.on('connect', () => {
			location.reload()
			return

			alert(
				'Соединение было утеряно. Необходимо обновить страницу для получения актуальных данных'
			).then(() => {
				location.reload()
			})
		})
	}, 15000)

	socket.emit('friends.online', (status, res) => {
		if (status == 1) {
			// Не авторизован
			return noFriendsTemplate.tmpl().appendTo(friendsOnlineList.empty())
		}

		if (status == 0) {
			if (res.length == 0) {
				noFriendsTemplate.tmpl().appendTo(friendsOnlineList.empty())
			} else {
				friendsOnlineList.empty()
				res.forEach((friend) => {
					friendOnlineTemplate.tmpl(friend.friend).appendTo(friendsOnlineList)
				})
				activateBSTooltips()
			}
		} else {
			alert(res)
		}
	})

	// Обновление количества игроков в онлайне
	socket.emit('online.count', (response) => {
		userOnlineCount.text(response.count)
		calcOnline()
	})

	// Запрашиваю список доступных смайлов для чата
	socket.emit('smiles.list', (smiles) => {
		smiles = smiles.join('|')
		smilePattern = new RegExp(`~(${smiles})`, 'g')

		// Получение последних сообщений с сервера
		lobbiSocket.emit('chat.last', (msgs) => {
			chat.empty()

			msgs.map((msg) => chat.prepend($('#messageTmpl').tmpl(parseMessage(msg))))

			setTimeout(() => scrollToEnd(true), 100)
			setTimeout(() => scrollToEnd(true), 300)

			needScroll && chatFixCheckbox.click()

			wideChat && chatWhideCheckbox.click()

			setTimeout(() => {
				$('.page-loader').addClass('removing')
				setTimeout(() => $('.page-loader').remove(), 300)
			}, 500)
		})
	})

	// Получение сообщения с сервера
	lobbiSocket.on('chat.message', (msg) => {
		chat.append(messageTemplate.tmpl(parseMessage(msg)))
		scrollToEnd()
	})

	lobbiSocket.on('chat.message.removed', (id) => {
		$(`.message-box[data-id='${id}'] .m-message`).html(
			'<small class="text-info">&lt; сообщение удалено &gt;</small>'
		)
	})

	// Получение количества пользователей онлайн с сервера
	socket.on('online.count', (count) => {
		userOnlineCount.text(count)
		calcOnline()
	})

	socket.on('friend.ingame', (friendId, gameId) => {
		$(`.online-friend-box[data-id=${friendId}]`).addClass('in-game')
		$(`.online-friend-box[data-id=${friendId}] .to-game`).attr(
			'href',
			`/game/${gameId}`
		)
	})

	socket.on('friend.leavegame', (friendId, gameId) => {
		$(`.online-friend-box[data-id=${friendId}]`).removeClass('in-game')
	})

	// Прокрутка чата до последних сообщений
	const scrollToEnd = (scroll = false) => {
		const height = chat[0].scrollHeight || 100000
		if (scroll || needScroll == 0) chat.scrollTop(height)
	}

	const typing = () => {
		if (typingMutex) return
		typingMutex = true
		setTimeout(() => (typingMutex = false), 2000)

		lobbiSocket.emit('chat.typing.begin')
		clearTimeout(timeoutTyping)
		timeoutTyping = setTimeout(() => {
			cancelTyping()
		}, 2500)
	}

	const cancelTyping = () => {
		clearTimeout(timeoutTyping)
		lobbiSocket.emit('chat.typing.end')
	}

	lobbiSocket.on('chat.typing.begin', (users) => {
		$('#typingTmpl')
			.tmpl({
				users,
				list: users.slice(0, 2).join(', '),
			})
			.appendTo($('.typing-box').empty())
	})

	lobbiSocket.on('chat.typing.end', (users) => {
		$('#typingTmpl')
			.tmpl({
				users,
				list: users.slice(0, 2).join(', '),
			})
			.appendTo($('.typing-box').empty())
	})

	// Отправка сообщения
	chatInput.keydown(function (event) {
		const message = $(this).val().trim()
		if (message == '') return true

		typing()

		if (event.key != 'Enter') return true

		cancelTyping()

		sendMessage(message)
		chatInput.val('')
		localStorage.setItem('input', '')

		if (smilesBox.css('display') == 'block') {
			smilesBox.removeClass('active')
			setTimeout(() => smilesBox.css('display', 'none'), 300)
		}
	})

	chatInput.keyup(function (event) {
		localStorage.setItem('input', chatInput.val())
	})

	// Вставка текста в поле ввода
	const insertTextToInput = (text) => {
		const input = chatInput[0]
		const pos = input.selectionStart
		input.setRangeText(text, pos, pos)
		input.selectionStart = pos + text.length
		input.focus()
		typing()
		localStorage.setItem('input', chatInput.val())
	}

	$('.friends-online').on('click', '.friend-info .f-nik', function (event) {
		event.preventDefault()
		const username = $(this).text()
		insertTextToInput(`[${username}] `)
		return false
	})

	$('.users-list').on('click', '.friend-info a', function (event) {
		event.preventDefault()
		const username = $(this).text()
		insertTextToInput(`[${username}] `)
		return false
	})

	const tmpl = (template, data) => {
		return $.tmpl(template, data).get()[0].outerHTML
	}

	// Функция возвращает распарсенное сообщение
	const parseMessage = (msg) => {
		if (msg.chatusers.length != 0 && msg.username == userNik)
			msg.highlight = true

		// Имена пользователей - на ссылки в профиль
		msg.chatusers.map((cu) => {
			msg.message = msg.message.replaceAll(`[${cu.account.username}]`, () => {
				if (cu.account.username == userNik) {
					msg.highlight = true
				}
				return tmpl(userTemplate, cu)
			})
		})

		// Ссылки преобразуются в гиперлинки
		msg.message = msg.message.replaceAll(urlPattern, (url) => {
			let link = url
			if (url.indexOf('//') < 0) link = '//' + url
			return tmpl(linkTemplate, { link, url })
		})

		// Смайлики заменяются на картинки
		msg.message = msg.message.replaceAll(smilePattern, (_, smile) => {
			return tmpl(smileTemplate, { smile })
		})

		// Смайлик :) заменяется на Hehe
		msg.message = msg.message.replaceAll(':)', (_, smile) => {
			return tmpl(smileTemplate, { smile: 'Hehe' })
		})

		// Достаём дату и время из ISO формта
		msg.time = getTimeFromIso(msg.createdAt)
		msg.date = getDateFromIso(msg.createdAt)

		return msg
	}

	// Отправка сообщения на сервер
	const sendMessage = (message) => {
		lobbiSocket.emit('chat.message', message)
	}

	// При получении и потере фокуса меняем стиль обводки поля
	chatInput
		.on('focus', function () {
			$(this).parent().addClass('active')
		})
		.on('focusout', function () {
			$(this).parent().removeClass('active')
		})

	// При нажатии на иконку настроек в чате
	chatWhideCheckbox.click(function () {
		if (chatWhideCheckbox[0].checked) chat.addClass('wide-chat')
		else chat.removeClass('wide-chat')
		localStorage.setItem('wideChat', chatWhideCheckbox[0].checked ? '1' : '0')
		setTimeout(() => scrollToEnd(), 400)
	})

	// Переключатель фиксации прокрутки чата
	chatFixCheckbox.click(function () {
		needScroll = chatFixCheckbox[0].checked
		localStorage.setItem('needScroll', needScroll ? 1 : 0)
	})

	// Добавляет в чат имя собеседника
	chat.on('click', '.m-nik', function () {
		const nik = `${userMarkerBegin}${$(this).text()}${userMarkerEnd} `
		insertTextToInput(nik)
		return false
	})

	$('.games-list').on('click', '.friend-info a', function () {
		const nik = `${userMarkerBegin}${$(this).text()}${userMarkerEnd} `
		insertTextToInput(nik)
		return false
	})

	// Открывает высплывающее окно со смайлами
	smilesOpenBtn.click(function () {
		toggleActive(smilesBox)
	})

	// Вставляет код смайла в поле ввода
	smilesBox.on('click', 'img', function () {
		insertTextToInput(`${$(this).attr('alt')} `)
	})
	chat.on('click', 'img', function () {
		insertTextToInput(`${$(this).attr('alt')} `)
	})

	// Выбор цветовой схемы
	colorShemeItem.click(function () {
		const { color } = $(this).data()
		colorShemeItem.each((_, item) => {
			const { color } = $(item).data()
			chatBox.removeClass(color)
		})
		chatBox.addClass(color)
		colorShemeItem.removeClass('active')
		$(this).addClass('active')
		localStorage.setItem('colorSheme', color)
	})

	fontSizeItem.click(function () {
		const { font } = $(this).data()
		fontSizeItem.each((_, item) => {
			const { font } = $(item).data()
			chat.removeClass(font)
		})
		chat.addClass(font)
		fontSizeItem.removeClass('active')
		$(this).addClass('active')
		localStorage.setItem('fontSize', font)
		setTimeout(() => scrollToEnd(), 300)
	})

	$('.color-sheme.' + colorSheme + ':first').click()

	// Показывает и скрывает блок
	const toggleActive = (block) => {
		if (block.css('display') != 'block') {
			block.css('display', 'block')
			setTimeout(() => block.addClass('active'))
		} else {
			block.removeClass('active')
			setTimeout(() => block.css('display', 'none'), 300)
		}
	}

	// Показывает настройки чата
	chatSettingsButton.click(function (event) {
		event.stopPropagation()
		toggleActive(chatSettingsBox)
	})

	chatSettingsBox.click(function (event) {
		event.stopPropagation()
	})

	$('body').click(function (event) {
		if (chatSettingsBox.css('display') == 'block') toggleActive(chatSettingsBox)
	})

	// Раскрывает чат на всю страницу
	chatExpandButton.click(function () {
		chatBox.toggleClass('expand')
		chatExpandButton
			.toggleClass('bi-arrows-fullscreen')
			.toggleClass('bi-arrows-angle-contract')
		$('body').toggleClass('fix-chat')
		setTimeout(() => {
			scrollToEnd()
		}, 500)
	})

	const getTimeFromIso = (isoDate) => {
		const dateObj = new Date(isoDate)
		const hour = _(dateObj.getHours())
		const minute = _(dateObj.getMinutes())
		return `${hour}:${minute}`
	}

	const getDateFromIso = (isoDate) => {
		const dateObj = new Date(isoDate)
		const year = dateObj.getFullYear()
		const month = _(dateObj.getMonth() + 1)
		const day = _(dateObj.getDate())
		return `${day}.${month}.${year}`
	}

	const _ = (d) => {
		if (d > 9) return d
		return `0${d}`
	}

	// Вызов формы для подачи жалобы
	chat.on('click', '.m-time', function () {
		const msgBox = $(this).parent().parent()

		if (msgBox.hasClass('system-message')) return

		const username = msgBox.find('.m-nik:first').text()
		const context = msgBox.find('.m-message').text().trim()

		const claimForm = $('#claimForm')

		if (!claimForm) return

		claimForm.find('.claim-user-name').text(username)
		claimForm.find('.claim-context').val(context)

		claimForm.modal('show')
	})

	// Отправка жалобы
	$('.btn-make-claim').click(function () {
		const claimData = {}
		claimData.username = $('.claim-user-name').text().trim()
		claimData.comment = $('.claim-context').val().trim()
		claimData.type = $('.claim-type').val()

		$('#claimForm').modal('hide')

		lobbiSocket.emit('claim', claimData, (res) => {
			const { status, msg } = res
			if (status != 0) return alert(msg)

			alert('Ваша жалоба принята')
		})
	})
})
