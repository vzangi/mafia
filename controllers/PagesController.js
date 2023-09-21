const smiles = require('../units/smiles')

class Pages {
  home(req, res) {
    res.render('pages/home')
  }

  lobbi(req, res) {
    res.render('pages/lobbi', { smiles })
  }

  login(req, res) {
    if (req.user) {
      return res.redirect('pages/lobbi')
    }
    res.render('pages/login')
  }

  registration(req, res) {
    if (req.user) {
      return res.redirect('pages/lobbi')
    }
    res.render('pages/reg')
  }

  restore(req, res) {
    if (req.user) {
      return res.redirect('pages/lobbi')
    }
    res.render('pages/restore')
  }
}

module.exports = new Pages()
