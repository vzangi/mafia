$(function () {

    // Включаем тултипы
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    })

    $(".action-add-to-friends").click(function () {
        const { id } = $(this).data()
        socket.emit('friends.add', id, (res) => {
            location.reload()
        })

    })

    $(".remove-from-frends").click(function () {
        const { id } = $(this).data()
        if (confirm("Удалить из друзей?")) {
            socket.emit('friends.remove', id, () => {
                location.reload()
            })
        }
    })

    $(".block-user").click(function () {
        const { id } = $(this).data()
        if (confirm("Заблокировать игрока?")) {
            socket.emit('friends.block', id, () => {
                location.reload()
            })
        }
    })

    $(".block-user-too").click(function () {
        const { id } = $(this).data()
        if (confirm("Заблокировать игрока?")) {
            socket.emit('friends.block.too', id, () => {
                location.reload()
            })
        }
    })

    $(".unblock-user").click(function () {
        const { id } = $(this).data()
        if (confirm("Разаблокировать игрока?")) {
            socket.emit('friends.unblock', id, () => {
                location.reload()
            })
        }
    })

    $(".to-zags").click(function () {
        const { id } = $(this).data()
        if (confirm("Вы уверены, что хотите сделать предложение?")) {
            socket.emit('friends.zags', id, (res) => {
                if (res && res.status == 0) {
                    location.reload()
                } else {
                    alert(res.msg)
                }
            })
        }
    })

    $(".remove-partner").click(function () {
        const { id } = $(this).data()
        if (confirm("Вы точно хотите развестись?")) {
            socket.emit('friends.divorce', id, () => {
                location.reload()
            })
        }
        return false
    })

    $(".remove-zags-request").click(function () {
        const { id } = $(this).data()
        if (confirm("Вы точно хотите отозвать предложение?")) {
            socket.emit('friends.zags.recall', id, () => {
                location.reload()
            })
        }
        return false
    })

})