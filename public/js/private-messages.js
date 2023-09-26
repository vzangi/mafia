$(function () {
  const messagesBtn = $('header .chatbox')
  const messagesWrapper = $('.bg-wrapper.messages-wrapper')
  const body = $('body')
  const pmForm = $('.pm-form')
  const pmChatBox = $('.pm-chat-box')
  const friendList = $('.pm-friends-list')

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

    $('#pmListItemTmpl').tmpl(data).appendTo(friendList)
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
  messagesWrapper.click(function () {
    messagesBtn.click()
  })

  pmForm.click(function (event) {
    event.preventDefault()
    return false
  })

  friendList.on('click', '.friend-item', function () {
    if ($(this).hasClass('active')) return
    const { id } = $(this).data()

    // Пробуем загрузить сообщения
    startPrivateWith(id)
  })

  const setActiveChat = (friendId) => {
    $('.friend-item.active').removeClass('active')
    $('[data-id=' + friendId + ']').addClass('active')
  }

  pmChatBox.click(function () {
    pmChatBox.removeClass('open')
  })

  window.startPrivateWith = (friendId) => {
    // Загружаем личные сообщения и проверяем можно ли вообще писать в приват этому игроку

    socket.emit('isFriend', friendId, async (res) => {
      if (res.status != 0) {
        return await alert(res.msg)
      }

      const { friend } = res

      socket.emit('messages.get', friendId, 0, async (res) => {
        if (res.status != 0) {
          return await alert(res.msg)
        }

        setActiveChat(friendId)

        console.log(friend, res.messages)

        messagesWrapper.css('display', 'block')
        body.addClass('fix-body')
        pmChatBox.addClass('open')
      })
    })
  }
})
