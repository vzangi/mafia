let tickIntervalId = null 

$(function () {

    // Элемент таймера на странице
    const time = $(".timer .value")

    // Фунцкия для добавления ведущего нуля
    const _0 = (d) => d < 0 ? '00' : d > 9 ? d : `0${d}`

    // Функция пересчёта времени дедлайна 
    const calcDeadline = (seconds, stamp) => {
        const totalSeconds = Math.floor(seconds + stamp / 1000 - Date.now() / 1000)
        const min = _0(Math.floor(totalSeconds / 60))
        const sec = _0(Math.floor(totalSeconds % 60))
        return `${min}:${sec}`
    }

    // Функция выполняемя циклично
    const tick = () => {
        const { seconds, stamp } = $(time).data()
        $(time).text(calcDeadline(seconds, stamp))
    }

    // Интервал для пересчёта времени 
    tickIntervalId = setInterval(tick, 1000)

    // Новый период в игре и время на него
    gameSocket.on('deadline', (seconds, period) => {
        console.log('deadline', seconds, period);
        $(time).data().seconds = seconds
        $(time).data().stamp = Date.now()
        tick()
    })

})