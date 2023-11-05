$(function(){
    $('.market-list').on('click', '.buy', function(){
        const { id } = $(this).data()
        if (!id) {
            return alert("Упс!")
        }
        confirm("Купить этот лот?").then((accept) => {
            if (!accept) return
            socket.emit('market.buy', id, (res) => {
                if (res.status != 0) {
                    return alert(res.msg)
                }
                alert('Покупка успешно проведена!').then(() => {
                    location.reload()
                })
            })
        })
    })
})