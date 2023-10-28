$(function(){
    const onlineSocket = io('/online')

    onlineSocket.on('online', (account) => {
        $("#onlineUserTmpl").tmpl(account).prependTo(".users-list")
    })

    onlineSocket.on('offline', (account) => {
        const { username } = account
        $(`[data-nik=${username}`).remove()
    })
})