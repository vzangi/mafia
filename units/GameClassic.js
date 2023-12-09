const Game = require('../models/Game')
const GamePlayer = require('../models/GamePlayer')
const GameBase = require('./GameBase')

// Игра в классическом режиме
class GameClassic extends GameBase {
  // Получаю доступные роли
  async getAvailableRoles() {
    const { game } = this
    const playersInGame = await GamePlayer.count({
      where: {
        gameId: game.id,
        status: GamePlayer.playerStatuses.IN_GAME,
      },
    })

    // Возвращаю доступные роли в зависимости от количества игроков в партии
    switch (playersInGame) {
      case 3:
      case 4:
        return [[Game.roles.MAFIA, 1]]
      case 5:
        return [
          [Game.roles.MAFIA, 1],
          [Game.roles.KOMISSAR, 1],
        ]
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
      case 11:
        return [
          [Game.roles.MAFIA, 2],
          [Game.roles.KOMISSAR, 1],
        ]
      case 12:
      case 13:
      case 14:
      case 15:
      case 16:
        return [
          [Game.roles.MAFIA, 3],
          [Game.roles.KOMISSAR, 1],
          [Game.roles.SERGEANT, 1],
        ]
    }

    // 17 и больше
    return [
      [Game.roles.MAFIA, 4],
      [Game.roles.KOMISSAR, 1],
      [Game.roles.SERGEANT, 1],
    ]
  }

  // Вычисление следующего периода игры
  async nextPeriod() {
    const { game } = this

    if (game.period == Game.periods.START) {
      await this.afterStart()
      return
    }

    if (game.period == Game.periods.DAY) {
      await this.afterDay()
      return
    }

    if (game.period == Game.periods.KOM) {
      await this.afterKom()
      return
    }

    if (game.period == Game.periods.NIGHT) {
      await this.afterNight()
      return
    }

    if (game.period == Game.periods.TRANSITION) {
      await this.afterTransition()
      return
    }
  }

  // Первый день
  async afterStart() {
    await this.nextDay()
  }

  // После дня
  async afterDay() {
    const { room, periodInterval } = this

    // останавливаю голосование
    room.emit('voting.stop')

    // Проверяю результаты голосования
    // если голосование не выявило посадку, то наступает новый день и снова идёт голосование

    // если кто-то отправился в тюрьму, то идёт проверка на конец игры

    // если игра не окончена, то идёт проверка кома (если он есть в игре)

    // если кома нет, то идёт ночь

    // Следующий период - проверка кома (если он есть в игре),
    // либо опять день,

    if (this.komInGame()) {
      await this.setPeriod(Game.periods.KOM, periodInterval)

      // Запускаю ход комиссара
      room.emit('kommissar.start')
    } else {
      // Ход мафии
      await this.setPeriod(Game.periods.NIGHT, periodInterval)

      // Запускаю ход мафии
      room.emit('mafia.start')
    }
  }

  // После хода кома
  async afterKom() {
    const { room, periodInterval } = this

    // Завершаю ход комиссара
    room.emit('kommissar.stop')

    await this.setPeriod(Game.periods.NIGHT, periodInterval)

    // Запускаю ход мафии
    room.emit('mafia.start')
  }

  // После ночи
  async afterNight() {
    const { room } = this

    // Завершаю ход мафии
    room.emit('mafia.stop')

    // Проверка на завершение игры
    // если игра не окончена, идём дальше

    // Проверяю наличие кома в игре
    if (this.komInGame()) {
      const { perehodInterval } = this

      // Если он есть, то даю 6 секунд на то, чтобы выдать проверку
      await this.setPeriod(Game.periods.TRANSITION, perehodInterval)
    } else {
      await this.nextDay()
    }
  }

  // После проверки
  async afterTransition() {
    await this.nextDay()
  }

  // Новый день
  async nextDay() {
    const { game, room, periodInterval } = this

    // Увеличиваю номер дня
    game.day += 1
        
    console.log('day: ', game.day);

    // Следующий период - день
    await this.setPeriod(Game.periods.DAY, periodInterval)
    
    this.systemMessage(`День ${game.day}. Игроки ищут мафию.`)
    
    // Начало голосования
    room.emit('voting.start', game.day)
  }
}

module.exports = GameClassic