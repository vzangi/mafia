$(function () {
  $('.make-noindexable').click(function () {
    const { id } = $(this).data()
    const self = this
    socket.emit('indexable', { id, noindex: true }, (res) => {
      const { status, msg } = res
      if (status != 0) return alert(msg)

      $(self).remove()
    })
  })
  $('.make-indexable').click(function () {
    const { id } = $(this).data()
    const self = this
    socket.emit('indexable', { id, noindex: false }, (res) => {
      const { status, msg } = res
      if (status != 0) return alert(msg)

      $(self).remove()
    })
  })
})
