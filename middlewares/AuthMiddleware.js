const { Op } = require('sequelize')
const Account = require('../models/Account')
const Punishment = require('../models/Punishment')

const isAuth = (req, res, next) => {
  const { user } = req
  if (user) return next()
  res.redirect('/login')
}

// Получение текущего пользователя
const getCurrentAccount = async (user) => {
  if (!user) return null

  const account = await Account.findOne({
    where: {
      id: user.id,
    },
    attributes: [
      'id',
      'username',
      'avatar',
      'vipTo',
      'online',
      'vip',
      'wallet',
      'status',
      'role',
      'gender',
      'rank',
      'level',
      'email',
      'telegramChatId',
      'skin',
    ],
    include: [
      {
        model: Punishment,
        where: {
          untilAt: {
            [Op.gt]: new Date().toISOString(),
          },
        },
        required: false,
      },
    ],
  })

  if (!account) return null

  const canLogin =
    account.punishments.filter((p) => p.type == Punishment.types.NO_LOGIN)
      .length == 0

  if (!canLogin) return null

  return account
}

// добавляю авторизованного пользователя в переменную user шаблонизатора
const userToTemplate = async (req, res, next) => {
  const { user } = req

  const account = await getCurrentAccount(user)

  if (account) {
    req.account = account
    res.locals.currentAccount = account
  } else {
    delete req.user
  }

  next()
}

// Добавляю пользователя в сокет
const userToSocket = async (socket, next) => {
  const { user } = socket

  const account = await getCurrentAccount(user)

  if (account) {
    socket.account = account
  } else {
    delete socket.user
  }

  next()
}

module.exports = {
  isAuth,
  userToTemplate,
  userToSocket,
}
