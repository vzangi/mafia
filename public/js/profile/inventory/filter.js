$(function () {
  // Cортировка вещей
  $('.sort-box select').change(function () {
    const sortBy = $(this).val()
    const items = $('.things-list-box .thing-item')

    const sortedItems = items.sort((a, b) => {
      const ta = $(a).data().thing
      const tb = $(b).data().thing

      // По умолчанию
      if (sortBy == 0) {
        if (ta.id > tb.id) return -1
        if (ta.id < tb.id) return 1
        return 0
      }

      // По имени
      if (sortBy == 1) {
        if (ta.thing.name > tb.thing.name) return 1
        if (ta.thing.name < tb.thing.name) return -1
        return 0
      }

      // По классу
      if (sortBy == 2) {
        if (ta.thing.thingclassId > tb.thing.thingclassId) return -1
        if (ta.thing.thingclassId < tb.thing.thingclassId) return 1
        return 0
      }

      // По типу
      if (sortBy == 3) {
        if (ta.thing.thingtypeId > tb.thing.thingtypeId) return 1
        if (ta.thing.thingtypeId < tb.thing.thingtypeId) return -1
        return 0
      }

      // По дате
      if (sortBy == 4) {
        if (ta.updatedAt > tb.updatedAt) return 1
        if (ta.updatedAt < tb.updatedAt) return -1
        return 0
      }
    })

    for (let item of sortedItems) {
      $(item).remove().appendTo('.things-list-box .things-list')
    }
  })

  // Фильтрация по типу вещи
  $('.type-box select').change(function () {
    const typeId = $(this).val()
    const items = $('.things-list-box .thing-item')

    items.removeClass('hide-item')

    if (typeId == 0) return

    items
      .filter((_, item) => $(item).data().thing.thing.thingtypeId != typeId)
      .addClass('hide-item')
  })

  // Фильтрация по имени
  $('.filter-box input').keyup(function () {
    const filterText = $(this).val().toLowerCase()
    const items = $('.things-list-box .thing-item')

    items
      .show()
      .filter(
        (_, item) =>
          $(item).data().thing.thing.name.toLowerCase().indexOf(filterText) < 0
      )
      .hide()
  })
})
