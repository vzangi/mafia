const smiles = require('../units/smiles')
const Account = require('../models/Account')

class Pages {
  // Главная страница
  home(req, res) {
    res.render('pages/home')
  }

  // Лобби
  lobbi(req, res) {
    res.render('pages/lobbi', { smiles })
  }

  // Вход на сайт
  login(req, res) {
    if (req.user) {
      return res.redirect('pages/lobbi')
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
    res.render('pages/online', { users })
  }

  // Список открыток
  gift(req, res) {
    const { to } = req.query
    res.render('pages/gift', { to, title: 'Подарить открытку' })
  }
}

module.exports = new Pages()
