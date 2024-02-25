const lobbiSocket = io('/lobbi')
const onlineSocket = io('/online')

lobbiSocket.on('reload', () => location.reload())
