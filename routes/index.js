module.exports = (app) => {
  app.use('/', require('./AuthRouter'))
  app.use('/', require('./PagesRouter'))
  app.use('/gift', require('./GiftsRouter'))
  app.use('/profile', require('./ProfileRouter'))
  app.use('/market', require('./MarketRouter'))

  app.use('/market', require('./admin/MarketRouter'))

  // Обработка страницы 404
  app.use((req, res, next) => {
    res.status(404).render('pages/404')
  })

  app.use((err, req, res, next) => {
    console.error(err)
    res.status(404).render('pages/404')
  })
}
