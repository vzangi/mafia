const { 
    app,        // express приложение
    server,     // http сервер
    io,         // сокеты
    sequelize   // база данных
} = require('./units/init')

// Запуск сервера
; (async function () {

    // Проверяю подключение к базе данных
    sequelize.authenticate().then(async () => {
        console.log('DB connected... ok')

        // Подключаю обработку сокетов
        require('./routes/SocketRouter')(io)

        // Подключаю роутинг
        require('./routes')(app)

        // Запускаю прослушку порта
        const PORT = process.env.PORT || 3000
        server.listen(PORT, () => {
            console.log(`Server started on ${PORT} port`)
        })

    }).catch((error) => {
        console.log("Error on start: ", error)
    })
})()