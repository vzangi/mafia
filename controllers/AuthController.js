const cookieTokenName = process.env.TOKEN_COOKIE || 'jwt'
const maxAge = 1000 * 60 * 60 * 24 * 30
const log = require('../units/customLog')

const service = require('../services/AuthService')

class AuthController {
  // Регистрация
  async register(req, res) {
    try {
      const { nik, email, password, passwordConfirm, accept } = req.body

      await service.register(nik, email, password, passwordConfirm, accept)
      res.json([{ msg: 'Регистрация прошла успешно' }])
    } catch (error) {
      // log(error)
      res.status(400).json([{ msg: error.message }])
    }
  }

  // Вход на сайт
  async login(req, res) {
    try {
      const { nik, password } = req.body

      const accessToken = await service.login(nik, password)
      res.cookie(cookieTokenName, accessToken, { maxAge })
      res.json({ msg: 'Вход выполнен успешно' })
    } catch (error) {
      // log(error)
      res.status(400).json([{ msg: error.message }])
    }
  }

  // Выход с сайта
  logout(req, res) {
    res.clearCookie(cookieTokenName)
    res.redirect('/')
  }

  // Подтверждение регистрации
  async accept(req, res) {
    try {
      const { email, hash } = req.params

      const accessToken = await service.accept(email, hash)
      res.cookie(cookieTokenName, accessToken, { maxAge })
      res.redirect('/')
    } catch (error) {
      log(error)
      res.status(400).json([{ msg: error.message }])
    }
  }

  // Запрос на восстановление пароля
  async restore(req, res) {
    try {
      const { email } = req.body

      await service.restore(email)
      res.json({
        msg: `Ссылка для восстановления пароля отправлена на ${email}`,
      })
    } catch (error) {
      log(error)
      res.status(400).json([{ msg: error.message }])
    }
  }

  // Авторизация по ссылке отправленной на почту для смены пароля
  async restorePassword(req, res) {
    try {
      const { email, hash } = req.params

      const accessToken = await service.restorePassword(email, hash)
      res.cookie(cookieTokenName, accessToken, { maxAge })
      res.redirect('/profile/change-password')
    } catch (error) {
      log(error)
      res.status(400).json([{ msg: error.message }])
    }
  }

  // Авторизация по ссылке отправленной на почту для смены пароля
  async VK_auth(req, res) {
    try {
      const { query } = req
      const { accessToken, account } = await service.VK_auth(query)

      // Если пришёл accessToken - пользователь авторизован
      if (accessToken) {
        res.cookie(cookieTokenName, accessToken, { maxAge })
        res.redirect('/lobbi')
        return
      }

      // Если пришёл аккаунт - надо выбрать ник
      if (account) {
        res.redirect(`/makenick?id=${account.id}&vkid=${account.username}`)
        return
      }

      // Если ничего не пришло - переход на логин
      res.redirect('/login')
    } catch (error) {
      log(error)
      res.redirect('/login')
    }
  }

  // Отображение формы смены ника
  async makenickForm(req, res) {
    try {
      const account = await service.getMakenickAccount(req.query)
      res.render('pages/auth/makenick', { account })
    } catch (error) {
      log(error)
      res.redirect('/login')
    }
  }

  // Установка нового ника
  async setnick(req, res) {
    try {
      const accessToken = await service.setnick(req.body)

      // Если пришёл accessToken - пользователь авторизован
      if (accessToken) {
        res.cookie(cookieTokenName, accessToken, { maxAge })
        res.redirect('/lobbi')
        return
      }

      // Если ничего не пришло - переход на логин
      res.redirect('/login')
    } catch (error) {
      log(error)
      res.status(400).json([{ msg: error.message }])
    }
  }
}

module.exports = new AuthController()
