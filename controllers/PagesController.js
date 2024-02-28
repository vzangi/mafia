const Account = require('../models/Account')

const service = require('../services/PagesService')

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
      console.log(error)
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
    const users = await Account.findAll({
      where: {
        online: 1,
      },
    })
    res.render('pages/online', {
      users,
      title: 'Онлайн список игроков Mafia One',
    })
  }

  // Список открыток
  gift(req, res) {
    const { to } = req.query
    res.render('pages/gift', { to, title: 'Подарить открытку' })
  }
}

module.exports = new PagesController()
