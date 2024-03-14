$(function () {
  const fileInput = $('.change-avatar-box input[type=file]')
  const genderSelect = $('#gender')
  const hideSetting = $('#inventhide')
  const avatarForm = $('.change-avatar-box form')
  const nikInput = $('.nik-box input')
  const nikAcceptBtn = $('.nik-box .btn')

  nikAcceptBtn.click(function () {
    const nik = nikInput.val()
    const title = nikAcceptBtn.attr('title')

    confirm(title, '', 'Продолжить', 'Отмена').then((accept) => {
      if (!accept) return

      socket.emit('nik.change', nik, (res) => {
        if (res.status != 0) {
          return alert(res.msg)
        }
        location.reload()
      })
    })
  })

  nikInput.keyup(function () {
    const { val } = $(this).data()
    const nik = $(this).val()
    if (nik != val) {
      $(this).parent().addClass('changed')
    } else {
      $(this).parent().removeClass('changed')
    }
  })

  $('.change-avatar-btn').click(function () {
    fileInput.click()
  })

  genderSelect.change(function () {
    const gender = $(this).val()
    socket.emit('profile.gender.change', gender)
  })

  hideSetting.change(function () {
    const val = $(this).val()
    socket.emit('setting.hideinvent', val, (res) => {
      const { status, msg } = res
      if (status != 0) alert(msg)
    })
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
        $('.avatar-box img').attr('src', `/uploads/${res.fileName}`)
        $('.h-image-box img').attr('src', `/uploads/${res.fileName}`)
      },
      error: function (err) {
        const { msg } = err.responseJSON[0]
        alert(msg)
      },
      cache: false,
      contentType: false,
      processData: false,
    })
  })
})
