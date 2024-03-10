const Game = require('../models/Game')
const GamePlayer = require('../models/GamePlayer')
const ContestPlayer = require('../models/ContestPlayer')
const GameClassic = require('./GameClassic')
const GameMulti = require('./GameMulti')
const GamePerestrelka = require('./GamePerestrelka')
const GameConstructor = require('./GameConstructor')
const Contest = require('../models/Contest')
const sequelize = require('./db')
const Account = require('../models/Account')
const deadlineInterval = 1000
const minCount = 3
const log = require('./customLog')
const { Op } = require('sequelize')

/*  ====================================
    Класс для управления текущими играми
    ==================================== */
class GamesManager {
	// Буфер для хранения текущих игр
	static activeGames = {}

	// Буфер для заявок на игры
	static whatingGames = {}

	/* =====================
     Загрузка игр и заявок
     ===================== */
	static async loadGames(io) {
		// Активные игры
		const activeGames = await Game.scope('active').findAll()

		// Загружаю воркеры для каждой игры
		activeGames.forEach((game) => {
			try {
				GamesManager.start(io, game)
			} catch (error) {
				log(`Ошибка при запуске воркера заявки ${game.id}: ${error.message}`)
			}
		})

		// Заявки в лобби
		const whatingGames = await Game.scope('whaiting').findAll()

		// Загрузка заявок в буфер (с доступом по номеру заявки)
		whatingGames.forEach((game) => (GamesManager.whatingGames[game.id] = game))

		// Запускаю интервал проверяющий дедлайны текущих заявок
		setInterval(GamesManager.checkDeadLine.bind(null, io), deadlineInterval)

		// Запускаю интервал проверяющий завершённые игры
		setInterval(GamesManager.checkEndedGames, 1000 * 60)

		// Запускаю интервал проверяющий очередь ждущих сорев
		setInterval(GamesManager.checkContests.bind(null, io), 1000 * 5)
	}

	/*  ====================================
      Проверка заявок на истекший дедлайн
      ==================================== */
	static async checkDeadLine(io) {
		// Беру текущее время
		const date = new Date()

		// Прохожу в цикле по каждой заявке
		for (let gameId in GamesManager.whatingGames) {
			// Беру заявку
			const game = GamesManager.whatingGames[gameId]

			// Если время дедлайна заявки меньше текущего времени
			if (game.deadline < date) {
				// Убираю заявку из списка ожидания
				delete GamesManager.whatingGames[gameId]

				// Проверяю, хватает ли игроков в заявке чтобы начать игру
				const check = await GamesManager.checkNeededPlayersCount(game)

				// Если хватает
				if (check) {
					try {
						// Пытаюсь запустить игру
						await GamesManager.start(io, game)
						break
					} catch (error) {
						log(error)
					}
				}

				// Если игроков не хватает или игру не удалось запустить - удаляю её
				await GamesManager.remove(io, game)
			}
		}
	}

	/*  ======================================
      Исключение завершившихся игр из буфера
      ====================================== */
	static checkEndedGames() {
		for (let gameId in GamesManager.activeGames) {
			const ag = GamesManager.activeGames[gameId]
			if (ag.game.status == Game.statuses.ENDED) {
				GamesManager.removeGame(gameId)
			}
		}
	}

	/*  ====================================
    Проверка очереди на сорев
    ==================================== */
	static async checkContests(io) {
		// Запрос спсика заявок с вышедшим временем ожидания
		const deadWhere = {
			where: {
				createdAt: {
					[Op.lt]: new Date(Date.now() - 1000 * 60 * ContestPlayer.whaitingTime)
						.toISOString()
						.replace('T', ' '),
				},
			},
		}

		//Ищу заявки у которых завершился дэдлайн
		const deadlined = await ContestPlayer.findAll(deadWhere)

		// Если такие заявки найдены
		if (deadlined.length != 0) {
			// Удаляю их
			await ContestPlayer.destroy(deadWhere)

			// Обновляю количество ожидающих сорева
			const concount = await ContestPlayer.concount()
			io.of('/lobbi').emit('update.concount', concount)
		}

		// Беру одного из ждущих игроков
		const contestPlayer = await ContestPlayer.findOne({
			include: [{ model: Contest }],
			order: sequelize.random(),
		})

		// Если нет ожидающих игроков - выхожу
		if (!contestPlayer) return
		const { contest } = contestPlayer

		// Необходимое количество игроков
		const neededPlayersCount = contest.playersCount

		// Игроки ждущие тот же режим
		const players = await ContestPlayer.findAll({
			where: {
				contestId: contest.id,
			},
			include: [{ model: Account }],
			limit: neededPlayersCount,
			order: sequelize.random(),
		})

		// Если найдено необходимое количество игроков
		if (neededPlayersCount == players.length) {
			const gameData = {}
			gameData.accountId = contestPlayer.accountId
			gameData.gametypeId = contest.gametypeId
			gameData.playersCount = contest.playersCount
			gameData.waitingTime = 0
			gameData.deadline = new Date().toISOString()
			gameData.competition = true
			gameData.mode = contest.mode

			// Создаю игру
			const newGame = await Game.create(gameData)
			const game = await Game.scope('whaiting').findByPk(newGame.id)

			// Добавляю в неё игроков
			for (const index in players) {
				// Беру аккаунт игрока
				const { account } = players[index]

				// Добавляю его в партию
				await GamePlayer.create({
					gameId: game.id,
					accountId: account.id,
					username: account.username,
				})

				// Удаляю его заявки из очереди
				await ContestPlayer.destroy({
					where: {
						accountId: account.id,
					},
				})
			}

			// Обновляю количество ожидающих сорева
			const concount = await ContestPlayer.concount()
			io.of('/lobbi').emit('update.concount', concount)

			// Помещаю игру в очередь для запуска
			GamesManager.whatingGames[game.id] = game
		}
	}

	/*  ==========================================================
      Проверка на необходимое количество игроков для начала игры
      ========================================================== */
	static async checkNeededPlayersCount(game) {
		// Беру игроков, которые находятся в заявке
		const playersInGame = await GamePlayer.count({
			where: {
				gameId: game.id,
				status: GamePlayer.playerStatuses.WHAITNG,
			},
		})

		// Если игроков больше или равно минимально допустимому количеству - возвращаю true
		if (playersInGame >= minCount) return true

		// Если мультирежим
		if (game.gametypeId == Game.types.CONSTRUCTOR) {
			// Игроков должно быть больше, чем задано ролей
		}

		// Если предыдущие условия не сработали,
		// значит игроков не хватает для начала игры
		return false
	}

	/*  ===========
      Запуск игры
      =========== */
	static async start(io, game) {
		// Убираю игру из списка ожидающих заявок, если она ещё там
		if (GamesManager.whatingGames[game.id]) {
			delete GamesManager.whatingGames[game.id]
		}

		// Буфер для типа запускаемой игры
		let gameTypeClass = null

		// Классический режим
		if (game.gametype.id == 1) {
			gameTypeClass = GameClassic
		}

		// Перестрелка
		if (game.gametype.id == 2) {
			gameTypeClass = GamePerestrelka
		}

		// Мультирежим
		if (game.gametype.id == 4) {
			gameTypeClass = GameMulti
		}

		// Конструктор
		if (game.gametype.id == 5) {
			gameTypeClass = GameConstructor
		}

		// Если тип игры не определён
		if (!gameTypeClass) {
			// Удаляю заявку
			await GamesManager.remove(io, game)

			throw new Error('Игра этого типа пока не поддерживается')
		}

		// Создаю воркер для новой игры
		const newGame = new gameTypeClass(io, game)

		// Помещаю его в буфер текущих игр
		GamesManager.activeGames[game.id] = newGame

		try {
			// Запускаю процесс игры
			await newGame.startGame()
		} catch (error) {
			log('Ошибка при запуске игры: ' + error.message)

			// Удаляю заявку
			await GamesManager.remove(io, game)
		}
	}

	/*  ===============
      Удаление заявки
      =============== */
	static async remove(io, game) {
		// Убираю игру из списка ожидающих заявок, если она ещё там
		if (GamesManager.whatingGames[game.id]) {
			delete GamesManager.whatingGames[game.id]
		}

		// Ставлю статус - игра НЕ началась
		game.status = Game.statuses.NOT_STARTED
		await game.save()

		// Освобождаю игроков из заявки
		await GamePlayer.update(
			{
				status: GamePlayer.playerStatuses.LEAVE,
			},
			{
				where: {
					gameId: game.id,
					status: [
						GamePlayer.playerStatuses.WHAITNG,
						GamePlayer.playerStatuses.IN_GAME,
						GamePlayer.playerStatuses.FREEZED,
					],
				},
			}
		)

		// Уведомляю игроков об удалении заявки
		io.of('/lobbi').emit('game.remove', game.id)
	}

	/*  ==================================
      Получение игры из буфера по номеру
      ================================== */
	static getGame(gameId) {
		try {
			// Ищу игру в буфере по его номеру
			const game = GamesManager.activeGames[gameId]

			// Возвращаю игру
			return game
		} catch (error) {
			log(`Игра ${gameId} не найдена`)

			// Если игры нет в списке - возвращаю null
			return null
		}
	}

	/*  ===================================
      Удаление игры из буфера текущих игр
      =================================== */
	static removeGame(gameId) {
		delete GamesManager.activeGames[gameId]
	}
}

module.exports = GamesManager
