$(function () {
  const urlPattern =
    /((http(s)?:\/\/.)?(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.#?&//=]*))/g

  const chatInput = $('.input-box input')
  const chatSettingsButton = $('.chat-settings > span.gear')
  const chatExpandButton = $('.chat-settings > span.expand')
  const chatBox = $('.chat-box')
  const chat = $('.chat')
  const log = $('.log')
  const smilesOpenBtn = $('.smiles')
  const smilesBox = $('.all-smiles')
  const chatSettingsBox = $('.chat-settings-box')
  const chatWhideCheckbox = $('input.chat-whide')
  const chatFixCheckbox = $('input.chat-fix')
  const colorShemeItem = $('.color-sheme')
  const fontSizeItem = $('.font-size')
  const userMarkerBegin = '['
  const userMarkerEnd = ']'
  const userNik = $('.user-nik').text()
  const chatInputBox = $('.chat-input-box')
  const privateCheckbox = $('.private-checkbox')

  const userTemplate = $('#userTmpl')
  const messageTemplate = $('#messageTmpl')
  const logTemplate = $('#logTmpl')
  const smileTemplate = $('#smileTmpl')
  const linkTemplate = $('#linkTmpl')

  let smilePattern = $('.smile-pattern').text()
  smilePattern = new RegExp(`~(${smilePattern})`, 'g')
  let timeoutTyping
  let needScroll = localStorage.getItem('needScroll') == '1'
  let wideChat = localStorage.getItem('wideChat') == '1'
  let colorSheme = localStorage.getItem('colorSheme') || 'dark'
  let fontSize = localStorage.getItem('fontSize') || 'font-16'

  const lastInput = localStorage.getItem('input')
  if (lastInput) {
    chatInput.val(lastInput)
    localStorage.setItem('input', '')
  }
  $('.show-claim-form').click(function () {
    const { username } = $(this).parent().parent().parent().data()
    const claimForm = $('#claimForm')
    claimForm.find('.chat-claim').hide()
    claimForm.find('.game-claim').show()
    claimForm.find('.game-claim:first')[0].selected = true
    claimForm.find('.claim-user-name').text(username)
    claimForm.modal('show')
  })

  chat.on('click', '.m-time', function () {
    const msgBox = $(this).parent().parent()

    if (msgBox.hasClass('system-message')) return

    const username = msgBox.find('.m-nik:first').text()
    const context = msgBox.find('.m-message').text().trim()

    const claimForm = $('#claimForm')

    if (!claimForm) return

    claimForm.find('.claim-user-name').text(username)
    claimForm.find('.claim-context').val(context)

    claimForm.find('.chat-claim').show()
    claimForm.find('.game-claim').hide()
    claimForm.find('.chat-claim:first')[0].selected = true

    claimForm.modal('show')
  })

  // Отправка жалобы
  $('.btn-make-claim').click(function () {
    const claimData = {}
    claimData.username = $('.claim-user-name').text().trim()
    claimData.comment = $('.claim-context').val().trim()
    claimData.type = $('.claim-type').val()

    $('#claimForm').modal('hide')

    gameSocket.emit('claim', claimData, (res) => {
      const { status, msg } = res
      if (status != 0) return alert(msg)

      alert('Ваша жалоба принята')
    })
  })

  // Получение сообщений
  gameSocket.emit('get.messages', (messages) => {
    messages.map((msg) =>
      chat.append($('#messageTmpl').tmpl(parseMessage(msg)))
    )

    setTimeout(() => scrollToEnd(true, false), 100)
  })

  // Получение лога
  gameSocket.emit('get.log', (logMessages) => {
    logTemplate.tmpl(logMessages).appendTo(log)
  })

  gameSocket.on('log', (logItem) => {
    logTemplate.tmpl(logItem).appendTo(log)
  })

  // Прокрутка чата до последних сообщений
  const scrollToEnd = (scroll = false, smooth = true) => {
    const height = chat[0].scrollHeight || 100000
    if (scroll || needScroll == 0) {
      if (smooth) {
        chat[0].scrollBy({
          top: height,
          left: 0,
          behavior: 'smooth',
        })
      } else {
        chat.scrollTop(height)
      }
    }
  }

  const typing = () => {
    if (chatInputBox.hasClass('private-active')) return
    gameSocket.emit('typing.begin')
    clearTimeout(timeoutTyping)
    timeoutTyping = setTimeout(cancelTyping, 2500)
  }

  const cancelTyping = () => {
    clearTimeout(timeoutTyping)
    gameSocket.emit('typing.end')
  }

  // событие печати в чате
  gameSocket.on('typing', (users) => {
    $('#typingTmpl')
      .tmpl({
        users,
        list: users.slice(0, 2).join(', '),
      })
      .appendTo($('.typing-box').empty())
  })

  chat.addClass(fontSize)
  $(`.font-size[data-font=${fontSize}]`).addClass('active')

  // Получение сообщения с сервера
  gameSocket.on('message', (msg) => {
    chat.append(messageTemplate.tmpl(parseMessage(msg)))
    scrollToEnd()
  })

  const tmpl = (template, data) => {
    return $.tmpl(template, data).get()[0].outerHTML
  }

  // Функция возвращает распарсенное сообщение
  const parseMessage = (msg) => {
    if (msg.gamechatusers.length != 0 && msg.username == userNik)
      msg.highlight = true

    // Имена пользователей - на ссылки в профиль
    msg.gamechatusers.map((cu) => {
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
    const isPrivate = chatInputBox.hasClass('private-active')
    gameSocket.emit('message', message, isPrivate)
  }

  // Отправка сообщения
  chatInput.keydown(function (event) {
    const message = $(this).val().trim()
    if (message == '') return true

    typing()

    if (event.key != 'Enter') return true

    cancelTyping()

    sendMessage(message)
    chatInput.val('')

    if (smilesBox.css('display') == 'block') {
      smilesBox.removeClass('active')
      setTimeout(() => smilesBox.css('display', 'none'), 300)
    }
  })

  // При получении и потере фокуса меняем стиль обводки поля
  chatInput
    .on('focus', function () {
      $(this).parent().addClass('active')
    })
    .on('focusout', function () {
      $(this).parent().removeClass('active')
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

  // Вставка текста в поле ввода
  const insertTextToInput = (text) => {
    const input = chatInput[0]
    const pos = input.selectionStart
    input.setRangeText(text, pos, pos)
    input.selectionStart = pos + text.length
    input.focus()
    typing()
  }

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

  // Переключатель фиксации прокрутки чата
  chatFixCheckbox.click(function () {
    needScroll = chatFixCheckbox[0].checked
    localStorage.setItem('needScroll', needScroll ? 1 : 0)
  })

  // Добавляет в чат имя собеседника
  chat.on('click', '.m-nik', function () {
    if ($(this).parent().parent().hasClass('private-message')) {
      if (!chatInputBox.hasClass('private-active')) {
        privateCheckbox.click()
      }
    }
    const nik = `${userMarkerBegin}${$(this).text()}${userMarkerEnd} `
    insertTextToInput(nik)
    return false
  })

  $('.player .username').click(function () {
    const nik = `${userMarkerBegin}${$(this).text()}${userMarkerEnd} `
    insertTextToInput(nik)
    return false
  })

  // переключение между логом и чатом
  $('.checker-item').click(function () {
    if ($(this).hasClass('checked')) return

    $(this).parent().find('.checker-item').toggleClass('checked')

    log.toggle()
    chat.toggle()
  })

  // При нажатии на иконку настроек в чате
  chatWhideCheckbox.click(function () {
    if (chatWhideCheckbox[0].checked) {
      chat.addClass('wide-chat')
      log.addClass('wide-chat')
    } else {
      chat.removeClass('wide-chat')
      log.removeClass('wide-chat')
    }
    localStorage.setItem('wideChat', chatWhideCheckbox[0].checked ? '1' : '0')
    setTimeout(() => scrollToEnd(), 400)
  })

  // Переключатель приватного режима
  privateCheckbox.click(function () {
    chatInputBox.toggleClass('private-active')
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

  $('.color-sheme.' + colorSheme + ':first').click()

  needScroll && chatFixCheckbox.click()

  wideChat && chatWhideCheckbox.click()
})
