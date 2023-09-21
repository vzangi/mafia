const bcrypt = require('bcrypt')
const pug = require('pug')
const { createToken } = require('../units/jwt')
const { mail } = require('../units/mailer')
const Account = require('../models/Account')
const cookieTokenName = process.env.TOKEN_COOKIE || 'jwt'
const maxAge = 1000 * 60 * 60 * 24 * 30
const saltNumber = 10

class Auth {
  async register(req, res) {
    const { nik, email, password, passwordConfirm, accept } = req.body

    const checkEmail = await Account.findOne({
      where: {
        email: email,
      },
    })

    if (checkEmail) {
      return res.status(400).json([{ msg: 'Email уже используется' }])
    }

    if (password !== passwordConfirm) {
      return res.status(400).json([{ msg: 'Пароли не совпадают' }])
    }

    const checkNik = await Account.findOne({
      where: {
        username: nik,
      },
    })

    if (checkNik) {
      return res.status(400).json([{ msg: 'Ник уже используется' }])
    }

    if (accept != 1) {
      return res
        .status(400)
        .json([{ msg: 'Необходимо согласиться с правилами сайта' }])
    }

    bcrypt.hash(password, saltNumber).then((hash) => {
      Account.create({
        username: nik,
        password: hash,
        email: email,
      })
        .then(async () => {
          // Отправка сообщения на почту !!!
          //welkome(email, nik)
          const reghash = await bcrypt.hash(
            email + process.env.SECRET_JWT_KEY,
            saltNumber
          )
          const link = `${process.env.APP_HOST}/accept/${email}/${reghash}`
          const message = pug.compileFile('./views/emails/welkome.pug')({
            nik,
            link,
          })
          mail(email, 'Регистрация на сайте Mafia One', message)

          res.json([{ msg: 'Регистрация прошла успешно' }])
        })
        .catch((err) => {
          console.log(err)
          res.status(400).json([{ msg: 'Ошибка при регистрации' }])
        })
    })
  }

  async login(req, res) {
    const { nik, password } = req.body

    const user = await Account.findOne({
      where: {
        username: nik,
      },
    })

    if (!user) {
      return res
        .status(400)
        .json([{ msg: 'Пользователь с таким ником не найден' }])
    }

    bcrypt.compare(password, user.password).then((match) => {
      if (!match) {
        return res
          .status(400)
          .json([{ msg: 'Неверное сочетание логина и пароля' }])
      }

      if (user.status == 0) {
        return res.status(400).json([{ msg: 'Необходимо подтвердить почту' }])
      }

      const accessToken = createToken(user)

      res.cookie(cookieTokenName, accessToken, {
        maxAge,
      })

      res.json({ msg: 'Вход выполнен успешно' })
    })
  }

  logout(req, res) {
    res.clearCookie(cookieTokenName)
    res.redirect('/')
  }

  async accept(req, res) {
    const { email, hash } = req.params
    bcrypt
      .compare(email + process.env.SECRET_JWT_KEY, hash)
      .then(async (valid) => {
        if (!valid) {
          return res.redirect('/')
        }
        const user = await Account.findOne({
          where: {
            email: email,
            status: 0,
          },
        })
        if (user) {
          user.update({ status: 1 })
          const accessToken = createToken(user)

          res.cookie(cookieTokenName, accessToken, {
            maxAge,
          })
        }

        return res.redirect('/')
      })
      .catch((err) => {
        console.log(err)
        res.json('err')
      })
  }

  async restore(req, res) {
    const { email } = req.body

    const user = await Account.findOne({
      where: {
        email,
      },
    })

    if (!user) {
      return res
        .status(400)
        .json([{ msg: 'Пользователь с таким email не найден' }])
    }

    if (user.status == 0) {
      return res
        .status(400)
        .json([{ msg: 'Аккаунт привязанный к этому email не подтверждён' }])
    }

    // Отправка сообщения на почту со ссылкой для смены пароля
    const hash = await bcrypt.hash(
      user.email + user.password + process.env.SECRET_JWT_KEY,
      saltNumber
    )
    const link = `${process.env.APP_HOST}/restore/${user.email}/${hash}`
    const message = pug.compileFile('./views/emails/restore.pug')({ link })
    mail(user.email, 'Восстановление пароля на Mafia One', message)

    res.json([
      { msg: 'Ссылка для восстановления пароля отправлена на ' + email },
    ])
  }

  async restorePassword(req, res) {
    const { email, hash } = req.params

    const user = await Account.findOne({
      where: {
        email,
      },
    })

    if (!user) {
      return res.redirect('/')
    }

    bcrypt
      .compare(user.email + user.password + process.env.SECRET_JWT_KEY, hash)
      .then((valid) => {
        if (!valid) {
          res.redirect('/')
        }

        const accessToken = createToken(user)

        res.cookie(cookieTokenName, accessToken, {
          maxAge,
        })

        // изменить редирект на страницу смены пароля
        res.redirect('/profile/change-password')
      })
  }
}

module.exports = new Auth()
