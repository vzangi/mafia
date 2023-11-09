$(function () {
  $('#filter').keyup(function () {
    const find = $(this).val()
    if (find == '') {
      $('tbody tr').show()
    } else {
      $(`span.name:not(:contains(${find}))`).parent().parent().hide()
    }
  })

  $('.table').on('click', 'tbody tr', function () {
    const { id } = $(this).data()
    location.href = `/market/things/edit/${id}`
  })

  $('.table').on('contextmenu', 'tbody tr', function () {
    const { id } = $(this).data()
    prompt('Кому подарить вещь?').then((username) => {
      const data = {
        id,
        username,
      }
      $.ajax({
        type: 'post',
        url: '/market/things/gift',
        data,
        success: function () {
          alert('Вещь подарена')
        },
        error: function (data) {
          console.log(data)
          alert(data.responseJSON.msg)
        },
      })
    })
    return false
  })
})
