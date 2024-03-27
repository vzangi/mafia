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

const isCorrectDate = (year, month, day) => {
  if (!/^\d{4}$/.test(year)) return false
  if (!/^\d{2}$/.test(month)) return false
  if (!/^\d{2}$/.test(day)) return false

  if (year < 2023 || year > 2030) return false
  if (month < 1 || month > 12) return false
  if (day < 1 || day > 31) return false

  return true
}

const isoFromDate = (date, p = 0) => {
  const d = date.split('.')
  const r = new Date(d[2], d[1] * 1 - 1, d[0] * 1 + p, 0, 0, 0, 0)
  return r.toISOString()
}

const isCorrectDateString = (date) =>
  /^[0-9]{2}[.][0-9]{2}[.][0-9]{4}$/.test(date)

module.exports = {
  getTimeFromIso,
  getDateFromIso,
  getDateTimeFromIso,
  getNowDateTime,
  getCoolDateTime,
  deadlineAfter,
  isCorrectDate,
  isoFromDate,
  isCorrectDateString,
}
