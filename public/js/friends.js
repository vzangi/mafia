$(function () {
    $(".remove-frend").click(function () {
        const { id } = $(this).data()
        if (confirm("Удалить из друзей?")) {
            socket.emit('friends.remove', id, () => {
                location.reload()
            })
        }
        return false
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
})