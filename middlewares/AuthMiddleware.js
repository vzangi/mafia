const { Op } = require('sequelize')
const Account = require('../models/Account')
const Punishment = require('../models/Punishment')

const isAuth = (req, res, next) => {
  const { user } = req
  if (user) return next()
  res.redirect('/login')
}

// добавляю авторизованного пользователя в переменную user шаблонизатора
const userToTemplate = async (req, res, next) => {
  const { user } = req

  if (!user) {
    return next()
  }

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

  const canLogin =
    account.punishments.filter((p) => p.type == Punishment.types.NO_LOGIN)
      .length == 0

  if (canLogin) {
    req.account = account
    res.locals.currentAccount = account
  } else {
    delete req.user
  }

  next()
}

const userToSocket = async (socket, next) => {
  const { user } = socket
  if (!user) return next()

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

  const canLogin =
    account.punishments.filter((p) => p.type == Punishment.types.NO_LOGIN)
      .length == 0

  if (canLogin) {
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
