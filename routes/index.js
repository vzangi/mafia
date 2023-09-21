const authRoutes = require('./AuthRouter')
const pageRoutes = require('./PagesRouter')
const profileRoutes = require('./ProfileRouter')

module.exports = (app) => {
    app.use('/', require('./AuthRouter'))
    app.use('/', require('./PagesRouter'))
    app.use('/profile', require('./ProfileRouter'))

    // Обработка страницы 404
    app.use((req, res, next) => {
        res.status(404).render('404')
    })
}