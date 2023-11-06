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
})
