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

const getDateTimeFromIso = (isoDate) => {
  return getDateFromIso(isoDate) + ' ' + getTimeFromIso(isoDate)
}

const getNowDateTime = () => {
  const now = new Date().toISOString()
  return getDateTimeFromIso(now)
}

const _ = (d) => {
  if (d > 9) return d
  return `0${d}`
}

module.exports = {
  getTimeFromIso,
  getDateFromIso,
  getDateTimeFromIso,
  getNowDateTime,
}
