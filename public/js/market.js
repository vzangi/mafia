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

  // Нажатие на кнопку "Найти"
  $('.filter-btn').click(function () {
    $("<div class='loading'><img src='/images/loading.gif'></div>").appendTo(
      $('.market-list').empty()
    )

    const types = $.map(
      $('.category-selected-items.category-types .category-item'),
      (t) => $(t).data().id
    )

    const classes = $.map(
      $('.category-selected-items.category-classes .category-item'),
      (t) => $(t).data().id
    )

    const collections = $.map(
      $('.category-selected-items.category-collections .category-item'),
      (t) => $(t).data().id
    )

    socket.emit('market.list', types, classes, collections, (res) => {
      if (res.status != 0) {
        return alert(res.msg)
      }
      const { offers } = res

      if (offers && offers.length > 0) {
        $('#offerTmpl').tmpl(res.offers).appendTo($('.market-list').empty())
      } else {
        $('#noOfferTmpl').tmpl().appendTo($('.market-list').empty())
      }
    })
  })

  // Вывести все офферы
  $('.filter-btn').click()
})
