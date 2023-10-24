const smiles = require('../units/smiles')

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
}

module.exports = new Pages()
