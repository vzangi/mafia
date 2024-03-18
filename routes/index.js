module.exports = (app) => {
  app.use('/', require('./AuthRouter'))
  app.use('/', require('./PagesRouter'))
  app.use('/profile', require('./ProfileRouter'))
  app.use('/market', require('./MarketRouter'))
  app.use('/trades', require('./TradeRouter'))
  app.use('/', require('./GameRouter'))

  // Роуты оплаты
  app.use('/', require('./YooKassaRouter'))
  app.use('/', require('./RoboKassaRouter'))

  app.use('/gift', require('./admin/GiftsRouter'))
  app.use('/market', require('./admin/MarketRouter'))

  // Обработка страницы 404
  app.use((req, res, next) => {
    res.status(404).render('pages/404')
  })

  // Глобальный обработчик при возникновении ошибок
  app.use((err, req, res, next) => {
    console.error(new Date().toLocaleString('ru-Ru'), err.message)
    res.status(404).render('pages/404')
  })
}
