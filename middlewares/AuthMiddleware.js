const Account = require('../models/Account')

const isAuth = (req, res, next) => {
  if (req.user) return next()
  res.redirect('/login')
}

// добавляю авторизованного пользователя в переменную user шаблонизатора
const userToTemplate = (req, res, next) => {
  if (req.user) {
    Account.findOne({
      where: {
        id: req.user.id,
      },
      attributes: ['id', 'username', 'avatar', 'vipTo', 'online', 'vip'],
    })
      .then((account) => {
        res.locals.currentAccount = account
        res.locals.user = req.user
        next()
      })
      .catch((err) => {
        console.log(err)
        next()
      })
  } else {
    next()
  }
}

module.exports = {
  isAuth,
  userToTemplate,
}
