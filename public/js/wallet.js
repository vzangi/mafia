$(function () {

    // Всего транзакций
    const totalTransactions = $(".total-transactions").text() * 1

    // Получение порции транзакций
    const getTransactions = (offset) => {
        socket.emit('transactions', offset, (events) => {
            if (events.length > 0) {
                $("#eventTmpl").tmpl(events).appendTo(".transactions")
                offset += events.length
                if (offset < totalTransactions)
                    $("#moreBtnTmpl").tmpl({ offset }).insertAfter(".table")
            }
        })
    }

    // Первичная загрузка транзакций
    if (totalTransactions == 0) {
        $("#noEventTmpl").tmpl().appendTo(".transactions")
    } else {
        getTransactions(0)
    }

    // Загрузка очередной порции транзакций при нажатии на кнопку "Загрузить ещё"
    $("article").on('click', '.moreBtn', function () {
        const { offset } = $(this).data()
        getTransactions(offset)
        $(this).remove()
    })

    $('.price-item').click(function () {
        $('.price-item').removeClass('active')
        $(this).addClass('active')
    })
    $('.other-sum').click(function () {
        let sum = prompt('Любая сумма от 1000 до 15000') * 1
        if (sum < 1000 || sum > 15000) return
        $('.price-item:last span').text(sum)
        $('.price-item:last').click()
    })

    $("#payBtn").click(function () {
        const sum = $(".price-item.active span").text() * 1
        const method = 1 // Способ оплаты
        if (sum < 50 || sum > 15000) return false

        socket.emit('payment', sum, method, (res) => {
            if (res.status != 0) {
                return alert(res.msg)
            }
            location.reload()
        })
    })
})
