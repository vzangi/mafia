$(function () {
  const toggleBox = (block) => {
    const blocks = $('.show.visible')
    blocks.each((index, element) => {
      if (element == block) return
      $(element).removeClass('visible')
      setTimeout(() => $(element).removeClass('show'), 300)
    })
    if (block.hasClass('show')) {
      block.removeClass('visible')
      setTimeout(() => block.removeClass('show'), 300)
    } else {
      block.addClass('show')
      setTimeout(() => block.addClass('visible'), 100)
    }
  }

  // Нажатие на кнопку +
  $('.category-block-box button').click(function () {
    const block = $(this).next()
    toggleBox(block)
  })

  // Нажатие на элемент категории в выпадающем списке
  $('.market-category-block').on('click', '.category-item', function () {
    const selectBox = $(this).parent().parent().parent().prev()
    const block = $(this).parent().parent()
    const btn = $(this).parent().parent().prev()
    const item = $(this).remove()
    item.appendTo(selectBox)
    if (block.find('.category-item').length == 0) {
      toggleBox(block)
      btn.hide()
    }
  })

  // Нажатие на элемент категории в списке выбранных элементов
  $('.category-selected-items').on('click', '.category-item', function () {
    const list = $(this).parent().next().find('.mc-wrapper')
    const btn = $(this).parent().next().find('button')
    const item = $(this).remove()
    item.appendTo(list)
    btn.show()
  })
})
