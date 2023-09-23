$(function () {

    socket.emit('transactions', 0, (events) => {
        console.log(events);
        $("#eventTmpl").tmpl(events).appendTo(".transactions")
    })

    $('.price-item').click(function(){
        $('.price-item').removeClass('active')
        $(this).addClass('active')
    })
    $('.other-sum').click(function(){
        let sum = prompt('Любая сумма от 1000 до 15000') * 1
        if (sum < 1000 || sum > 15000) return
        $('.price-item:last span').text(sum)
        $('.price-item:last').click()
    })

    $("#payBtn").click(function(){
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
