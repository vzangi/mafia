// Подключаюсь к сокету игры
const gameSocket = io('/game')
const onlineSocket = io('/online')

let myRole = null

$(function () {
  // Элемент с именем роли на странице
  const roleName = $('.role-name')

  // Получение роли
  gameSocket.emit('get.role', (role) => {
    console.log(role)
    roleName.text(role.name)

    myRole = role

    if (role.username != '') {
      $(`.player[data-username=${role.username}]`)
        .addClass(`role-${role.id}`)
        .addClass('iam')
    }

    if (role.id != 2) {
      $('.kill-dot').remove()
    }

    gameSocket.emit('get.roles', (roles) => {
      console.log('roles', roles)

      if (roles) {
        roles.forEach((r) => {
          const { role } = r
          const player = $(`.player[data-username=${role.username}]`)
          $(`<span>${role.name}</span>`).appendTo(player.find('.friend-info'))
          player.addClass(`role-${role.id}`)
        })

        if (role.id == 2) {
          $('.player.role-2').find('.kill-dot').remove()
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
    $(`.player[data-username=${username}] .friend-avatar`).addClass('online')
  })

  onlineSocket.on('offline', (account) => {
    const { username } = account
    $(`.player[data-username=${username}] .friend-avatar`).removeClass('online')
  })
})
