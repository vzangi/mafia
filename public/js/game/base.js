// Подключаюсь к сокету игры
const gameSocket = io('/game')

$(function () {

    // Элемент с именем роли на странице
    const roleName = $(".role-name")

    // Получение роли
    gameSocket.emit('get.role', (role) => {
        console.log(role);
        roleName.text(role.name)

        // Убираю лоадер
        setTimeout(() => {
            $(".loader").css('opacity', 0)
            setTimeout(() => $(".loader").remove(), 300)
        }, 500)
    })

    gameSocket.on('user.online', (username) => {
        $(`.player[data-username=${username}] .friend-avatar`).addClass('online')
    })

    gameSocket.on('user.offline', (username) => {
        $(`.player[data-username=${username}] .friend-avatar`).removeClass('online')
    })
})