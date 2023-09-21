const smiles = require('../units/smiles')

class Pages {

    home(req, res) {
        res.render('home')
    }

    lobbi(req, res) {
        res.render('lobbi', { smiles })
    }

    login(req, res) {
        if (req.user) {
            return res.redirect('/lobbi')
        }
        res.render('login')
    }

    registration(req, res) {
        if (req.user) {
            return res.redirect('/lobbi')
        }
        res.render('reg')
    }

    restore(req, res) {
        if (req.user) {
            return res.redirect('/lobbi')
        }
        res.render('restore')
    }
}

module.exports = new Pages()