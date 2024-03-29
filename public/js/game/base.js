// Подключаюсь к сокету игры
const gameSocket = io('/game')
const onlineSocket = io('/online')

let myRole = null

$(function () {
  // Элемент с именем роли на странице
  const roleName = $('.role-name')
  const roleForm = $('#roleForm')

  // Получение роли
  gameSocket.emit('get.role', (role) => {
    roleName.text(role.name)
    if (role.picture)
      $(`<img src='${role.picture}'>`)
        .appendTo($('.role-icon'))
        .click(function () {
          roleForm.modal('show')
        })

    myRole = role

    if (roleForm.length > 0 && myRole.id > 0) {
      if (myRole.picture)
        $(`<img src=${myRole.picture} alt="${myRole.name}">`).appendTo(
          roleForm.find('.rolePicture')
        )
      roleForm.find('.roleName').text(myRole.name)
      roleForm.find('.roleDesc').text(myRole.description)
    }

    if (!localStorage.getItem('dontShowRoleForm')) {
      if ($('header.game-period-1').length == 1) {
        if (roleForm.length > 0 && myRole.id > 0) {
          roleForm.modal('show')
        }
      }
    } else {
      $('#dontShowCheck')[0].checked = true
    }

    if (role.username != '') {
      $(`.player[data-username='${role.username}']`)
        .addClass(`role-${role.id}`)
        .addClass('iam')

      roleName.prev().removeClass('d-hidden')
    }

    if (role.id != 2) {
      $('.kill-dot').remove()
    }

    if (role.id != 3 && role.id != 4) {
      $('.prova-dot').remove()
    } else {
      $('.iam .prova-dot').remove()
    }

    if (role.id == 4) {
      $('.prova-dot').hide()
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

  $('#dontShowCheck').change(function () {
    if (this.checked) {
      localStorage.setItem('dontShowRoleForm', '1')
    } else {
      localStorage.removeItem('dontShowRoleForm')
    }
  })

  // setTimeout(() => {
  // 	gameSocket.on('connect', () => {
  // 		alert(
  // 			'Соединение было утеряно. Необходимо обновить страницу для получения актуальных данных'
  // 		).then(() => {
  // 			location.reload()
  // 		})
  // 	})
  // }, 5000)
})
