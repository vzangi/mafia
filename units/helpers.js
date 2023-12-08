const getTimeFromIso = (isoDate) => {
  const dateObj = new Date(isoDate)
  const hour = _(dateObj.getHours())
  const minute = _(dateObj.getMinutes())
  return `${hour}:${minute}`
}

const getDateFromIso = (isoDate) => {
  const dateObj = new Date(isoDate)
  const year = dateObj.getFullYear()
  const month = _(dateObj.getMonth() + 1)
  const day = _(dateObj.getDate())
  return `${year}.${month}.${day}`
}

const getMonthName = (month) => {
  switch (month) {
    case 1:
      return 'янв'
    case 2:
      return 'фев'
    case 3:
      return 'мар'
    case 4:
      return 'апр'
    case 5:
      return 'май'
    case 6:
      return 'июн'
    case 7:
      return 'июл'
    case 8:
      return 'авг'
    case 9:
      return 'сен'
    case 10:
      return 'окт'
    case 11:
      return 'ноя'
    case 12:
      return 'дек'
  }
  return ''
}

const getCoolDateFromIso = (isoDate) => {
  const dateObj = new Date(isoDate)
  const year = dateObj.getFullYear()
  const month = getMonthName(dateObj.getMonth() + 1)
  const day = dateObj.getDate()
  return `${day} ${month} ${year}`
}

const getDateTimeFromIso = (isoDate) => {
  return getDateFromIso(isoDate) + ' ' + getTimeFromIso(isoDate)
}

const getNowDateTime = () => {
  const now = new Date().toISOString()
  return getDateTimeFromIso(now)
}

const getCoolDateTime = (isoDate) => {
  return getCoolDateFromIso(isoDate) + ' ' + getTimeFromIso(isoDate)
}

const _ = (d) => {
  if (d > 9) return d
  return `0${d}`
}

// Получение даты и времени через minutes + seconds
const deadlineAfter = (minutes, seconds = 0) => {
  return new Date(new Date().getTime() + (minutes * 60 + seconds) * 1000)
}

module.exports = {
  getTimeFromIso,
  getDateFromIso,
  getDateTimeFromIso,
  getNowDateTime,
  getCoolDateTime,
  deadlineAfter,
}
