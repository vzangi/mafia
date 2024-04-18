$(function () {
  const reportForm = $('#reportForm')

  reportForm.modal('show')

  reportForm.find('form').submit(function (event) {
    event.preventDefault()
    const form = this
    const btn = $(form).find('button.btn')

    if (btn.attr('disabled')) return
    btn.attr('disabled', 'disabled')

    const formData = new FormData(form)

    $.ajax({
      url: '/report-form',
      type: 'post',
      data: formData,
      success: function (res) {
        reportForm.modal('hide')
        alert(
          'Благодарим за обратную связь! Мы получили ваше сообщение и уже думаем что с ним делать)'
        )
        form.reset()
      },
      error: function (err) {
        btn.removeAttr('disabled')
        const { msg } = err.responseJSON[0]
        alert(msg)
      },
      cache: false,
      contentType: false,
      processData: false,
    })
  })
})
