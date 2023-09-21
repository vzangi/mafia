const socket = io()


function playSound(sound) {
    setTimeout(function () {
        if (sound.readyState == 4) {
            sound.play()
        } else {
            playSound(sound)
        }
    }, 10)
}

$(function () {
    let zvuk = null; 

    const setCount = (count) => {
        if (count == 0) return
        $("a>span.cnt")
            .text(count)
            .removeClass('hide')
            .parent()
            .removeClass('hide')
        $(".h-image-box").addClass('has-notify')
    }

    socket.emit('friends.request.count', (friendRequestsCount) => {
        setCount(friendRequestsCount)
    })

    socket.on('friend.request', (friendRequestsCount) => {
        if (!zvuk) {
            zvuk = new Audio('/sounds/zvuk.mp3')
            zvuk.volume = 1
            $('body').append(zvuk)
        }
        setCount(friendRequestsCount)
        playSound(zvuk)
    })
})
