const { sign, verify } = require('jsonwebtoken')
const { parse } = require('cookie')
const secretKey = process.env.SECRET_JWT_KEY || 'To be or not to be mafia one'
const tokenCookieName = process.env.TOKEN_COOKIE || 'jwt'

// Функция создающая токен
const createToken = (user) => {
  const { id } = user
  const accessToken = sign({ id }, secretKey)
  return accessToken
}

// Промежуточная функция для проверки наличия и валидности токена
const validateToken = (req, _, next) => {
  const accessToken = req.cookies[tokenCookieName]

  if (!accessToken) return next()

  try {
    const validToken = verify(accessToken, secretKey)
    if (validToken) {
      req.user = validToken
    }
  } catch (error) {
    console.log(error)
  }

  next()
}

// Проверяет токен в сокете по токену jwt в куках
const validateTokenInSocket = (socket, next) => {
  try {
    socket.user = ''
    const cookie = socket.handshake.headers.cookie
    if (!cookie) return next()

    const parsedCookie = parse(cookie)

    if (!parsedCookie[tokenCookieName]) return next()

    socket.user = verify(parsedCookie[tokenCookieName], secretKey)
  } catch (error) {
    console.log(error)
  }

  next()
}

module.exports = {
  createToken,
  validateToken,
  validateTokenInSocket,
}
