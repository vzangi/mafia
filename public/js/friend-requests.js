$(function () {

    $(".friend-box .accept").click(function () {
        const { id } = $(this).data()
        if (confirm('Добавить в друзья?')) {
            socket.emit('friends.accept', id, () => {
                location.reload()
            })
        }
        return false
    })

    $(".friend-box .decline").click(function () {
        const { id } = $(this).data()
        if (confirm('Отклонить заявку в друзья?')) {
            socket.emit('friends.decline', id, () => {
                location.reload()
            })
        }
        return false
    })

    $(".zags-box .accept-zags").click(function () {
        const { id } = $(this).data()
        if (confirm('Принять предложение?')) {
            socket.emit('friends.zags.accept', id, () => {
                location.reload()
            })
        }
        return false
    })

    $(".zags-box .decline-zags").click(function () {
        const { id } = $(this).data()
        if (confirm('Отклонить предложение?')) {
            socket.emit('friends.zags.decline', id, () => {
                location.reload()
            })
        }
        return false
    })
})