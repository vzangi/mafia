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
    /((http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.#?&//=]*))/g
  const userTemplate = $('#userTmpl')
  const messageTemplate = $('#messageTmpl')
  const smileTemplate = $('#smileTmpl')
  const linkTemplate = $('#linkTmpl')

  const noFriendsTemplate = $('#noFriendsOnlineTmpl')
  const friendOnlineTemplate = $('#friendOnlineTmpl')

  let smilePattern = ''
  let timeoutTyping
  let needScroll = localStorage.getItem('needScroll') == '1'
  let wideChat = localStorage.getItem('wideChat') == '1'
  let colorSheme = localStorage.getItem('colorSheme') || 'dark'
  let fontSize = localStorage.getItem('fontSize') || 'font-16'

  chat.addClass(fontSize)
  $(`.font-size[data-font=${fontSize}]`).addClass('active')

  friendsOnlineFilterInput.keyup(function () {
    const filter = $(this).val()
    $('.online-friend-box').each((_, friend) => {
      if ($(friend).find('.friend-info a').text().indexOf(filter) < 0) {
        $(friend).slideUp()
      } else {
        $(friend).slideDown()
      }
    })
  })

  setTimeout(() => {
    socket.on('connect', () => {
      alert(
        'Соединение было утеряно. Необходимо обновить страницу для получения актуальных данных'
      ).then(() => {
        location.reload()
      })
    })
  }, 5000)

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
      }
    } else {
      alert(res)
    }
  })

  // Обновление количества игроков в онлайне
  socket.emit('online.count', (response) => {
    userOnlineCount.text(response.count)
  })

  // Запрашиваю список доступных смайлов для чата
  socket.emit('smiles.list', (smiles) => {
    smiles = smiles.join('|')
    smilePattern = new RegExp(`(${smiles})`, 'g')

    // Получение последних сообщений с сервера
    lobbiSocket.emit('chat.last', (msgs) => {
      chat.empty()

      msgs.map((msg) => chat.prepend($('#messageTmpl').tmpl(parseMessage(msg))))

      setTimeout(() => scrollToEnd(true), 100)
      setTimeout(() => scrollToEnd(true), 300)

      needScroll && chatFixCheckbox.click()

      wideChat && chatWhideCheckbox.click()
    })
  })

  // Получение сообщения с сервера
  lobbiSocket.on('chat.message', (msg) => {
    chat.append(messageTemplate.tmpl(parseMessage(msg)))
    scrollToEnd()
  })

  // Получение количества пользователей онлайн с сервера
  socket.on('online.count', (count) => {
    userOnlineCount.text(count)
  })

  // Прокрутка чата до последних сообщений
  const scrollToEnd = (scroll = false) => {
    const height = chat[0].scrollHeight || 100000
    if (scroll || needScroll == 0) chat.scrollTop(height * 2)
  }

  const typing = () => {
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
  chatSettingsButton.click(function () {
    toggleActive(chatSettingsBox)
  })

  // Раскрывает чат на всю страницу
  chatExpandButton.click(function () {
    chatBox.toggleClass('expand')
    chatExpandButton
      .toggleClass('ion-arrow-expand')
      .toggleClass('ion-arrow-shrink')
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
})
