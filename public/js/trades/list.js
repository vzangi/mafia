$(function () {

    // Нажатие на "Отменить"
    $('.decline-btn').click(function () {
        const { id } = $(this).data()
        confirm('Отменить обмен?').then(accept => {
            if (!accept) return

            socket.emit('trades.decline', id, (res) => {
                if (res.status != 0) {
                    return alert(res.msg)
                }
                $(`.trade-item[data-id=${id}]`).remove()
                notify('Обмен отменён')
            })
        })
    })

    // Нажатие на "Принять"
    $('.accept-btn').click(function(){
        const { id } = $(this).data()
        confirm('Принять обмен?').then(accept => {
            if (!accept) return

            socket.emit('trades.accept', id, (res) => {
                if (res.status != 0) {
                    return alert(res.msg)
                }
                $(`.trade-item[data-id=${id}]`).remove()
                notify('Обмен успешно принят')
            })
        })
    })
})