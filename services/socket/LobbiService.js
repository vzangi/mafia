const BaseService = require('./BaseService')
const Game = require('../../models/Game')
const GameType = require('../../models/GameType')
const GamePlayer = require('../../models/GamePlayer')

const waitingGames = []

class LobbiService extends BaseService {
  constructor(io, socket) {
    super(io, socket)

    // При запуске сервера проверяю наличие запущенных игр
    Game
      //.scope('def')
      .findAll({
        where: {
          status: 0,
        },
      })
      .then((games) => {
        games.forEach((game) => waitingGames.push(game))
      })

    // Раз в секунду проверяю заявки с истёкшим сроком дедлайна
    setInterval(this._checkDeadLine.bind(this), 1000)
  }

  _checkDeadLine() {
    const date = new Date()
    for (let index = 0; index < waitingGames.length; index++) {
      const game = waitingGames[index]
      // console.log(game.deadline, date)
      if (game.deadline < date) {
        console.log(`Для игры ${game.id} дедлайн истёк`)

        // Проверяю количество игроков в заявке
        // Если их меньше чем необходимо, то удаляю заявку

        // Иначе запускаю игру

        // Пока просто удаляю...
        waitingGames.splice(index, 1)
        index--

        this._removeGame(game)
      }
    }
  }

  // Удаление игры
  async _removeGame(game) {
    const { socket } = this

    // Ставлю статус 1 - игра не началась
    game.status = 1
    await game.save()

    // Для игроков тоже ставлю статус 1
    await GamePlayer.update(
      {
        status: 1,
      },
      {
        where: {
          gameId: game.id,
        },
      }
    )

    // Уведомляю об удалении заявки
    socket.emit('game.remove', game.id)
  }

  // Доступные типы игр
  async getGameTypes() {
    const types = await GameType.findAll()
    return types
  }

  // Новая заявка на игру
  async makeGame(gametypeId, playersCount, waitingTime, description = '') {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!gametypeId || !playersCount || !waitingTime) {
      throw new Error('Нет необходимых данных')
    }

    // Проверяю, может ли игрок создать заявку:

    // 1. Он не находится в другой заявке
    const inGame = await GamePlayer.count({
      where: {
        accountId: user.id,
        status: 0,
      },
    })

    if (inGame != 0) {
      throw new Error('Ты находишься в другой заявке')
    }

    // 2. Нет запрета на создание заявки

    // ... надо будет придумать

    // Устанавливаю дедлайн - время когда заявка удалиться,
    // если нуное количество игроков не соберётся
    const dt = new Date()
    const deadline = new Date(dt.getTime() + waitingTime * 60000)

    // Создаю заявку на игру
    const newGame = await Game.create({
      accountId: user.id,
      gametypeId,
      playersCount,
      waitingTime,
      description,
      deadline,
    })

    // Добавляю в неё игрока
    const player = await GamePlayer.create({
      accountId: user.id,
      gameId: newGame.id,
    })

    // Получаю новую заявку
    const game = await Game.scope('def').findByPk(newGame.id)

    // Добавляю её в список ожидающих заявок
    waitingGames.push(game)

    // и возвращаю её
    return newGame
  }
}

module.exports = LobbiService
