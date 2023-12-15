const Game = require('../models/Game')
const GamePlayer = require('../models/GamePlayer')
const GameClassic = require('./GameClassic')
const deadlineInterval = 1000
const minCount = 3

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
        console.log(
          `Ошибка при запуске воркера заявки ${game.id}: `,
          error.message
        )
      }
    })

    // Заявки в лобби
    const whatingGames = await Game.scope('whaiting').findAll()

    // Загрузка заявок в буфер (с доступом по номеру заявки)
    whatingGames.forEach((game) => (GamesManager.whatingGames[game.id] = game))

    // Запускаю интервал проверяющий дедлайны текущих заявок
    setInterval(GamesManager.checkDeadLine.bind(null, io), deadlineInterval)
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
            console.log(error.message)
          }
        }

        // Если игроков не хватает или игру не удалось запустить - удаляю её
        await GamesManager.remove(io, game)
      }
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
    if (game.gametypeId == 4) {
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

    // Если тип игры не определён
    if (!gameTypeClass) {
      // Удаляю заявку
      await GamesManager.remove(io, game)

      throw new Error('Игра этого типа пока не поддерживается')
    }

    console.log('Создаю воркер для новой игры')

    // Создаю воркер для новой игры
    const newGame = new gameTypeClass(io, game)

    console.log('Помещаю его в буфер текущих игр')

    // Помещаю его в буфер текущих игр
    GamesManager.activeGames[game.id] = newGame

    try {
      console.log('Запускаю процесс игры')

      // Запускаю процесс игры
      await newGame.startGame()
    } catch (error) {
      console.log('Ошибка при запуске игры: ', error.message)

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
      console.log(`Игра ${gameId} не найдена`)

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
