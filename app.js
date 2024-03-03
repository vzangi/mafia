const {
	app, // express приложение
	server, // http сервер
	io, // сокеты
	sequelize, // база данных
} = require('./units/init')
const GamesManager = require('./units/GamesManager')
const log = require('./units/customLog')

// Запуск сервера
;(async function () {
	// Проверяю подключение к базе данных
	sequelize
		.authenticate()
		.then(async () => {
			log('DB connected... ok')

			// Загружаю игры, которые были до старта сервера
			await GamesManager.loadGames(io)

			// Подключаю обработку сокетов
			require('./routes/SocketRouter')(io)

			// Подключаю роутинг
			require('./routes')(app)

			// Запускаю прослушку порта
			const PORT = process.env.PORT || 3000
			server.listen(PORT, () => {
				log(`Server started on ${PORT} port`)
			})
		})
		.catch((error) => {
			log('Error on start: ' + error.message)
		})
})()
