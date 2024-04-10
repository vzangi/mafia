$(function () {
  $('#login-form').submit(function (e) {
    e.preventDefault()

    const data = {}
    data.nik = $('#login-form-nik').val()
    data.password = $('#login-form-pass').val()

    $.ajax({
      type: 'post',
      url: '/login',
      data,
      success: function (data, status) {
        location.href = '/lobbi'
      },
      error: function (data) {
        $('.alert').text(data.responseJSON[0].msg).slideDown()
      },
    })

    return false
  })
})
