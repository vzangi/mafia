$(function () {
  const fileInput = $('.change-avatar-box input[type=file]')
  const genderSelect = $('#gender')
  const avatarForm = $('.change-avatar-box form')

  $('.change-avatar-btn').click(function () {
    fileInput.click()
  })

  genderSelect.change(function () {
    const gender = $(this).val()
    console.log(gender)
    socket.emit('profile.gender.change', gender)
  })

  fileInput.change(function () {
    avatarForm.submit()
  })

  avatarForm.submit(function (event) {
    event.preventDefault()

    const formData = new FormData(this)

    $.ajax({
      url: location.pathname,
      type: 'post',
      data: formData,
      success: function (res) {
        console.log(res)
        $('.avatar-box img').attr('src', `/uploads/${res.fileName}`)
        $('.h-image-box img').attr('src', `/uploads/${res.fileName}`)
      },
      error: function (err) {
        console.log(err)
        const { msg } = err.responseJSON
        alert(msg)
      },
      cache: false,
      contentType: false,
      processData: false,
    })
  })
})
