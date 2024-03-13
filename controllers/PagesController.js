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
    res.render('pages/auth/login')
  }

  // Регистрация
  registration(req, res) {
    if (req.user) {
      return res.redirect('pages/lobbi')
    }
    res.render('pages/auth/reg')
  }

  // Восстановление пароля
  restore(req, res) {
    if (req.user) {
      return res.redirect('pages/lobbi')
    }
    res.render('pages/auth/restore')
  }

  // Список игроков онлайн
  async online(req, res) {
    try {
      const users = await service.online()
      res.render('pages/online', {
        users,
        title: 'Онлайн список игроков Mafia One',
      })
    } catch (error) {
      log(error)
    }
  }

  // Список открыток
  gift(req, res) {
    const { to } = req.query
    res.render('pages/gift', { to, title: 'Подарить открытку' })
  }

  // Список топа недели
  async topOfWeek(req, res, next) {
    try {
      const { user } = req
      const data = await service.topOfWeek(user)
      data.title = 'Топ недели игроков Mafia One'
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
      res.render('pages/users', data)
    } catch (error) {
      log(error)
      next()
    }
  }
}

module.exports = new PagesController()
