const service = require('../services/PagesService')
const log = require('../units/customLog')

class PagesController {
  // Главная страница
  home(req, res) {
    res.render('pages/home')
  }

  // Лобби
  async lobbi(req, res, next) {
    try {
      const { user } = req
      const data = await service.lobbi(user)

      // Если пользователь в игре
      if (data.gameId) {
        // Переадресовываем его сразу в игру
        return res.redirect(`/game/${data.gameId}`)
      }

      res.render('pages/lobbi', data)
    } catch (error) {
      log(error)
      next(error)
    }
  }

  // Вход на сайт
  login(req, res) {
    if (req.user) {
      return res.redirect('/lobbi')
    }
    const data = {}
    data.vkappid = process.env.VK_APP_ID || 1
    data.host = process.env.APP_HOST || 'https://mafia-one.com'
    data.redirect_url = '/vk_auth'
    data.uuid = `${Math.ceil(Math.random() * 1000000)}-${Math.ceil(
      Math.random() * 1000000
    )}`

    res.render('pages/auth/login', data)
  }

  // Регистрация
  registration(req, res) {
    if (req.user) {
      return res.redirect('/lobbi')
    }
    res.render('pages/auth/reg')
  }

  // Восстановление пароля
  restore(req, res) {
    if (req.user) {
      return res.redirect('/lobbi')
    }
    res.render('pages/auth/restore')
  }

  // Список игроков онлайн
  async online(req, res) {
    try {
      const users = await service.online()
      res.render('pages/online', { users })
    } catch (error) {
      log(error)
    }
  }

  // Список открыток
  gift(req, res) {
    try {
      const { to } = req.query
      res.render('pages/gift', { to })
    } catch (error) {
      log(error)
    }
  }

  // Список топа недели
  async topOfWeek(req, res, next) {
    try {
      const { user } = req
      const data = await service.topOfWeek(user)
      res.render('pages/top-of-week', data)
    } catch (error) {
      log(error)
      next()
    }
  }

  // Очистить топ недели
  async clearTopOfWeek(req, res, next) {
    try {
      const { secret } = req.params
      await service.clearTopOfWeek(secret)
      log('Сброс топа недели')
      res.send('ok')
    } catch (error) {
      log(error)
      next()
    }
  }

  // Список игроков онлайн
  async users(req, res, next) {
    try {
      const { account } = req
      if (!account) throw new Error('Не авторизован')
      if (account.role != 1) throw new Error('Нет прав доступа')
      const data = await service.users()
      data.title = 'Список игроков Mafia One'
      res.render('pages/admin/users', data)
    } catch (error) {
      log(error)
      next()
    }
  }

  // Страница репорта
  async reportForm(req, res) {
    if (!req.user) {
      return res.redirect('/login')
    }
    res.render('pages/report')
  }

  // Обработчик репорта
  async report(req, res) {
    try {
      const { account } = req
      if (!account) return res.redirect('/login')

      await service.report(req)

      res.render('pages/report', { success: true })
    } catch (error) {
      log(error)
      res.render('pages/report', { error: error.message })
    }
  }

  // Форма репорта
  async ajaxReportForm(req, res) {
    try {
      if (!req.user)
        throw new Error('Чтобы отправить отзыв - необходимо авторизоваться')
      res.render('partial/report-form')
    } catch (error) {
      res.status(400).json([{ msg: error.message }])
    }
  }

  async sendReport(req, res) {
    try {
      await service.sendReport(req)
      res.json({ status: 0 })
    } catch (error) {
      res.status(400).json([{ msg: error.message }])
    }
  }

  // Список игроков онлайн
  async getReports(req, res, next) {
    try {
      const { account } = req
      if (!account) throw new Error('Не авторизован')
      if (account.role != 1) throw new Error('Нет прав доступа')
      const data = await service.getReports()
      data.title = 'Список отзывов и предложений'
      res.render('pages/admin/reports', data)
    } catch (error) {
      log(error)
      next()
    }
  }
}

module.exports = new PagesController()
