$(function () {
  $('body').on('click', '.show-report-form', function () {
    const reportForm = $('#reportForm')
    if (reportForm.length) {
      reportForm.modal('show')
    } else {
      $.ajax({
        url: '/report-form',
        success: function (res) {
          $(res).appendTo('body')
        },
        error: function (res) {
          const { msg } = res.responseJSON[0]
          alert(msg)
        },
      })
    }
  })
})
