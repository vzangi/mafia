$(function () {
  const searchBtn = $('header .search')
  const searchWrapper = $('.bg-wrapper.search-wrapper')
  const body = $('body')
  const searchInput = $('#user-search-input')
  const searchResult = $('.user-search-result')
  const form = $(".user-search-box form")
  let searchTimeoutId

  // Нажатие на лупу в хэдере
  searchBtn.click(function () {
    if (searchWrapper.css('display') == 'block') {
      searchWrapper.css('display', 'none')
      body.removeClass('fix-body')
    } else {
      searchWrapper.css('display', 'block')
      body.addClass('fix-body')
      setTimeout(() => searchInput.focus(), 50)
    }
  })

  // Нажатие на бэкграунд (закрытие окна поиска)
  searchWrapper.click(function (event) {
    if (event.currentTarget != event.target) return
    searchBtn.click()
  })

  form.submit(function(event){
    event.preventDefault()
    return false
  })

  // Ввод ника в поле поиска
  searchInput.keyup(function () {
    clearTimeout(searchTimeoutId)
    searchTimeoutId = setTimeout(() => {
      const nik = searchInput.val().trim()
      if (nik == '') {
        searchResult.empty()
        return
      }
      socket.emit('user.search', nik, (users) => {
        searchResult.empty()
        if (users.length == 0) {
          $('#searchUserNotFoundTmpl').tmpl().appendTo(searchResult)
        } else {
          $('#searchUserTmpl').tmpl(users).appendTo(searchResult)
        }
      })
    }, 500)
  })
})
