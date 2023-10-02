$(function () {
  const messagesBtn = $('header .chatbox')
  const messagesWrapper = $('.bg-wrapper.messages-wrapper')
  const body = $('body')
  const pmForm = $('.pm-form')
  const pmChatBox = $('.pm-chat-box')
  const friendList = $('.pm-friends-list')

  const linkTemplate = $('#linkTmpl')
  const smileTemplate = $('#smileTmpl')

  const urlPattern =
    /((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w\-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/g

  let currentFriendId
  let smilePattern = ''

  // Запрашиваю список доступных смайлов для чата
  socket.emit('smiles.list', (smiles) => {
    smiles = smiles.join('|')
    smilePattern = new RegExp(`(${smiles})`, 'g')
  })

  // Получение списка последних приаватных сообщений от каждого друга
  const getMessagesList = () => {
    socket.emit('messages.list', (res) => {
      if (res.status != 0) return

      const data = res.lastMsgs.map((msg) => {
        if (msg.accountId == res.userId) {
          return {
            message: msg.message,
            ...msg.friend,
          }
        } else {
          return {
            message: msg.message,
            ...msg.account,
          }
        }
      })

      friendList.empty()
      $('#pmListItemTmpl').tmpl(data).appendTo(friendList)
    })
  }

  getMessagesList()

  // Пришло новое сообщение
  socket.on('messages.new', (msg) => {
    getMessagesList()

    // Если чат с другом открыт, то отображаем сообщение
    if (currentFriendId == msg.friendId || currentFriendId == msg.accountId) {
      showMessage(msg, true)
      setTimeout(() => {
        scrollMessages()
      }, 100)
    }
    // Иначе оповещаем о новом сообщении
    else {
    }
  })

  // Отправка сообщения
  pmForm.on('keydown', '.pm-chat-input-box input', function (event) {
    const message = $(this).val().trim()
    if (message == '') return true

    // typing()

    if (event.key != 'Enter') return true

    // cancelTyping()

    socket.emit('messages.send', currentFriendId, message, (status, msg) => {
      if (status != 0) {
        return alert(msg)
      }
      getMessagesList()
      showMessage(msg, true)
      scrollMessages()
    })
    $(this).val('')

    // if (smilesBox.css('display') == 'block') {
    //   smilesBox.removeClass('active')
    //   setTimeout(() => smilesBox.css('display', 'none'), 300)
    // }
  })

  // Нажатие на шеврон закрывает чат
  pmForm.on('click', '.back', function () {
    $('.friend-item.active').removeClass('active')
    pmChatBox.removeClass('open')
  })

  // Нажатие на иконку приватных чатов в хэдере
  messagesBtn.click(function () {
    if (messagesWrapper.css('display') == 'block') {
      messagesWrapper.css('display', 'none')
      body.removeClass('fix-body')
    } else {
      messagesWrapper.css('display', 'block')
      body.addClass('fix-body')
    }
  })

  // Нажатие на бэкграунд (закрытие окна поиска)
  messagesWrapper.click(function (event) {
    if (event.currentTarget != event.target) return
    messagesBtn.click()
  })

  // Загрузка сообшений про выборе игрока из списка
  friendList.on('click', '.friend-item', function () {
    if ($(this).hasClass('active')) return
    const { id } = $(this).data()

    // Пробуем загрузить сообщения
    startPrivateWith(id)
  })

  // Выделяем активный чат
  const setActiveChat = (friendId) => {
    $('.friend-item.active').removeClass('active')
    $('[data-id=' + friendId + ']').addClass('active')
  }

  // Запуск приватного чата
  window.startPrivateWith = (friendId) => {
    // Загружаем личные сообщения и проверяем можно ли вообще писать в приват этому игроку
    socket.emit('isFriend', friendId, async (res) => {
      if (res.status != 0) {
        return await alert(res.msg)
      }

      const { friend } = res

      // Запоминаем Id друга
      currentFriendId = friendId

      // Выделяем активный чат
      setActiveChat(friendId)

      // Выводим шаблон окна чата с сообщениями
      $('#privateMessagesBoxTmpl')
        .tmpl(friend)
        .appendTo($('.pm-chat-box').empty())

      // Изначально берем послежние сообщения
      $('.pm-chat').data().offset = 0

      // При скролле сообщений - подгружаем историю
      $('.pm-chat').scroll(function () {
        if ($('.pm-chat').data().end) return

        // достигли начала чата
        if ($(this).scrollTop() < 100) {
          // Достаем сдвиг по id из окна чата
          const { offset } = $(this).data()

          // Загружаем последние сообщения с учётом сдвига
          getMessages(friendId, offset, () => {
            if (offset == 0) {
              scrollMessages(false)
              messagesWrapper.css('display', 'block')
              body.addClass('fix-body')
              pmChatBox.addClass('open')
            }
          })
        }
      })

      // Запускаем процесс загрузки
      $('.pm-chat').scroll()
    })
  }

  // Получение сообщений с учётом сдвига по id
  const getMessages = (friendId, offset, callback) => {
    socket.emit('messages.get', friendId, offset, async (res) => {
      if (res.status != 0) {
        return await alert(res.msg)
      }

      if (res.messages.length == 0 && offset == 0) {
        if (callback) callback()
        return $('#noMessagesTmpl').tmpl().appendTo($('.pm-chat'))
      }

      if (res.messages.length == 0) {
        if (callback) callback()
        return ($('.pm-chat').data().end = true)
      }

      if (offset == 0) {
        $('.pm-chat').data().lastDate = getDateFromIso(
          res.messages[0].createdAt
        )
      }

      if (offset != 0) {
        if (
          $('.messages-date:first').text() ==
          getDateFromIso(res.messages[0].createdAt)
        ) {
          $('.messages-date:first').remove()
        }
      }

      $('.pm-chat').data().offset = res.messages[res.messages.length - 1].id

      for (msg of res.messages) {
        showMessage(msg)
      }

      $('#messageDateTmpl')
        .tmpl({ date: $('.pm-chat').data().lastDate })
        .prependTo($('.pm-chat'))

      if (callback) callback()
    })
  }

  // Отображаем сообщение
  const showMessage = (msg, append = false) => {
    $('.nomessages').remove()
    const { lastDate } = $('.pm-chat').data()

    // Получаю дату и время в читаемом виде
    msg.time = getTimeFromIso(msg.createdAt)
    msg.date = getDateFromIso(msg.createdAt)

    // Показываем разные шаблоны в зависимости от того, кто отправил сообщения
    let template = '#friendPrivateMessagesTmpl'
    if (msg.friendId == currentFriendId) {
      template = '#myPrivateMessagesTmpl'
    }

    if (append) {
      return $(template).tmpl(msg).appendTo($('.pm-chat'))
    }

    if (lastDate != msg.date) {
      $('#messageDateTmpl').tmpl({ date: lastDate }).prependTo($('.pm-chat'))
      $('.pm-chat').data().lastDate = msg.date
    }

    // отображаем сообщение в чате
    $(template).tmpl(parseMessage(msg)).prependTo($('.pm-chat'))
  }

  // Функция возвращает распарсенное сообщение
  const parseMessage = (msg) => {
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

  const tmpl = (template, data) => {
    return $.tmpl(template, data).get()[0].outerHTML
  }

  function scrollMessages(smooth = true) {
    setTimeout(() => {
      const data = {
        top: 10000,
        left: 0,
      }
      if (smooth) data.behavior = 'smooth'
      $('.pm-chat')[0].scrollBy(data)
    }, 10)
  }

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
