// Подключаюсь к сокету игры
const gameSocket = io('/game')
const onlineSocket = io('/online')

let myRole = null

$(function () {
  // Элемент с именем роли на странице
  const roleName = $('.role-name')

  // Получение роли
  gameSocket.emit('get.role', (role) => {
    roleName.text(role.name)

    myRole = role

    if (role.username != '') {
      $(`.player[data-username='${role.username}']`)
        .addClass(`role-${role.id}`)
        .addClass('iam')

      roleName.prev().removeClass('d-hidden')
    }

    // не маф, не адвокат и не адвокат
    if (role.id != 2 && role.id != 6 && role.id != 8) {
      $('.kill-dot').remove()
    }

    // Маньяк не может убить себя
    // А адвокат защищать
    if (role.id == 6 || role.id == 8) {
      $('.iam .kill-dot').remove()
    }

    // не ком и не серж
    if (role.id != 3 && role.id != 4) {
      $('.prova-dot').remove()
    } else {
      $('.iam .prova-dot').remove()
    }

    // серж не может проверять сразу
    if (role.id == 4) {
      $('.prova-dot').hide()
    }

    // не врач
    if (role.id != 5) {
      $('.doc-dot').remove()
    } else {
      // Не может лечить себя
      $('.iam .doc-dot').remove()
    }

    gameSocket.emit('get.roles', (roles) => {
      if (roles) {
        roles.forEach((r) => {
          const { role } = r
          const username = r.player.username
          const player = $(`.player[data-username='${username}']`)
          if (player.find('.role').length == 0) {
            $('#playerRoleTmpl')
              .tmpl(role)
              .appendTo(player.find('.friend-info'))
          }
          player.addClass(`role-${role.id}`).addClass('role-showed')
        })

        if (role.id == 2) {
          $('.player.role-2 .kill-dot').remove()
          $('.player.role-7 .kill-dot').remove()
        }

        if (role.id == 3 || role.id == 4) {
          $('.player.role-showed .prova-dot').remove()
        }
      }

      // Убираю лоадер
      setTimeout(() => {
        $('.loader').css('opacity', 0)
        setTimeout(() => $('.loader').remove(), 300)
      }, 500)
    })
  })

  onlineSocket.on('online', (account) => {
    const { username } = account
    $(`.player[data-username='${username}'] .friend-avatar`).addClass('online')
  })

  onlineSocket.on('offline', (account) => {
    const { username } = account
    $(`.player[data-username='${username}'] .friend-avatar`).removeClass(
      'online'
    )
  })

  setTimeout(() => {
    gameSocket.on('connect', () => {
      alert(
        'Соединение было утеряно. Необходимо обновить страницу для получения актуальных данных'
      ).then(() => {
        location.reload()
      })
    })
  }, 5000)
})
