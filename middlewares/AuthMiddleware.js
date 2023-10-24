const Account = require('../models/Account')

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
      id: req.user.id,
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
  })

  req.account = account
  res.locals.currentAccount = account

  next()
}

module.exports = {
  isAuth,
  userToTemplate,
}
