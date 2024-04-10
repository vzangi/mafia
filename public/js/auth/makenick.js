$(function () {
  $('#makenick-form').submit(function (e) {
    e.preventDefault()

    const data = {}
    data.nik = $('#makenick-form-nik').val()
    data.id = $('#makenick-form-id').val()
    data.vkid = $('#makenick-form-username').val()

    $.ajax({
      type: 'post',
      url: '/makenick',
      data,
      success: function (data, status) {
        location.replace('/lobbi')
      },
      error: function (data) {
        $('.alert').text(data.responseJSON[0].msg).slideDown()
      },
    })

    return false
  })
})
