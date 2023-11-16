$(function () {
  // Показываю список вещей, если в селекте выбран подарочный набор (3) или кейс (4)
  $('[name=thingtypeId]').change(function () {
    const id = $(this).val()
    $('.items-list').addClass('hide')
    if (id == 3 || id == 4) {
      $('.items-list').removeClass('hide')
    }
  })

  // Вставляю в скрытый инпут выбранные вещи
  $('.items-list input').change(function () {
    const items = JSON.parse($('[name=items]').val())

    const { id } = $(this).data()

    const index = items.indexOf(id)

    if (index < 0) items.push(id)
    else items.splice(index, 1)

    $('[name=items]').val(JSON.stringify(items))
  })
})
