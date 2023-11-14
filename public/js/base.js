// Общий веб-сокет
const socket = io()

// Звук нотификации
let zvuk = new Audio('/sounds/notification.mp3')
$('body').append(zvuk)

// Воспроизводит звук на странице
function playSound(sound) {
  setTimeout(function () {
    if (sound.readyState == 4) {
      sound.play()
    } else {
      playSound(sound)
    }
  }, 10)
}

// Отображает нотификацию
function notify(msg, timeout = 0, lvl = 0) {
  lvls = ['success', 'warning', 'danger', 'info']
  notifier.show(msg, '', lvls[lvl], '', timeout)
}

function coolDate(date) {
  const _ = (r) => (r > 9 ? r : `0${r}`)

  const monthes = [
    'янв',
    'фев',
    'мар',
    'апр',
    'мая',
    'июн',
    'июл',
    'авг',
    'сен',
    'окт',
    'ноя',
    'дек',
  ]

  const d = new Date(date)
  const day = d.getDate()
  const month = monthes[d.getMonth()]
  const year = d.getFullYear()
  const hour = _(d.getHours())
  const min = _(d.getMinutes())

  return `${day} ${month}  ${year} ${hour}:${min}`
}

// Включаем тултипы
function activateBSTooltips() {
  const tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  )
  tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl)
  })
}

$(function () {
  activateBSTooltips()

  // Действие по нажатию на кнопку
  async function action(btn) {
    const { id, question, event } = $(btn).data()
    if (await confirm(question)) {
      socket.emit(event, id, async (res) => {
        if (res && res.status != 0) {
          return await alert(res.msg)
        }
        location.reload()
      })
    }
  }

  // Кнопки с действиями
  $('.action-btn').click(function () {
    action(this)
  })
})
