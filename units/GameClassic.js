const Game = require('../models/Game')
const GamePlayer = require('../models/GamePlayer')
const GameStep = require('../models/GameStep')
const GameBase = require('./GameBase')

// Игра в классическом режиме
class GameClassic extends GameBase {
  // Получаю доступные роли
  async getAvailableRoles() {
    const { players } = this
    const playersInGame = players.length

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
          [Game.roles.SERGEANT, 1],
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
      await this.nextDay()
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
      await this.transition()
      return
    }

    if (game.period == Game.periods.TRANSITION) {
      await this.afterNight()
      return
    }
  }

  // Новый день
  async nextDay() {
    const { game, room, periodInterval } = this

    // Увеличиваю номер дня
    game.day += 1

    await this.systemMessage(`<hr>`)
    await this.systemMessage(`День ${game.day}. Игроки ищут мафию.`)

    // Следующий период - день
    await this.setPeriod(Game.periods.DAY, periodInterval)

    // Начало голосования
    room.emit('voting.start', game.day)
  }

  // После дня
  async afterDay() {
    const { room } = this

    // останавливаю голосование
    room.emit('voting.stop')
    await this.systemMessage('Голосование окончено. Считаем голоса.')

    // Проверяю результаты голосования
    const zek = await this.voteResults()

    // если голосование не выявило посадку, то наступает новый день и снова идёт голосование
    if (!zek) {
      await this.systemMessage(
        'Договориться не удалось. Голосование продолжается.'
      )
      await this.nextDay()
      return
    }

    const player = this.getPlayerById(zek)

    // Меняю статус игрока на "в тюрьме"
    player.status = GamePlayer.playerStatuses.PRISONED
    await player.save()

    const role = await player.getRole()

    await this.systemMessage(
      `${role.name} <b>${player.username}</b> отправляется в тюрьму.`
    )

    // Если посажен комиссар - надо посмотреть есть ли в игре сержант
    // Если есть, то передаю роль комиссара ему
    if (role.id == Game.roles.KOMISSAR) await this.updateSergeant()

    // Показываю роль посаженного игрока всем
    await this.showPlayerRole(player, GamePlayer.playerStatuses.PRISONED)

    // Проверка на окончание игры
    const winnerSide = await this.isOver()
    if (winnerSide) {
      return await this.gameOver(winnerSide)
    }

    // Если ком ещё в игре
    if (this.komInGame()) {
      const hasUnlooked = await this.hasUnlookedPlayers()

      // Если есть непроверенные игроки
      if (hasUnlooked) {
        // то идёт проверка кома
        await this.komStep()
      } else {
        this.systemMessage('Комиссар окончил своё расследование.')

        // Ход мафии
        await this.mafiaStep()
      }
    } else {
      // если кома нет, то сразу идёт ночь
      await this.mafiaStep()
    }
  }

  // Ход кома
  async komStep() {
    const { room, periodInterval } = this

    await this.systemMessage('<hr>')
    await this.systemMessage('Ход комиссара.')

    await this.setPeriod(Game.periods.KOM, periodInterval)

    // Запускаю ход комиссара
    room.emit('kommissar.start')
  }

  // После хода кома
  async afterKom() {
    const { room } = this

    // Завершаю ход комиссара
    room.emit('kommissar.stop')

    await this.mafiaStep()
  }

  // Ход мафии
  async mafiaStep() {
    const { periodInterval, room } = this

    await this.systemMessage('<hr>')
    await this.systemMessage('Наступила ночь. Ход мафии.')

    // Ход мафии
    await this.setPeriod(Game.periods.NIGHT, periodInterval)

    // Запускаю ход мафии
    room.emit('mafia.start')
  }

  // Переход после хода мафии
  async transition() {
    const { room } = this

    // Завершаю ход мафии
    room.emit('mafia.stop')

    await this.systemMessage('Внимание! Считаем трупы на рассвете.')

    // Проверяю наличие кома в игре
    if (this.komInGame()) {
      const { perehodInterval } = this

      // Если он есть, то даю 6 секунд на то, чтобы выдать проверку
      await this.setPeriod(Game.periods.TRANSITION, perehodInterval)
    } else {
      await this.afterNight()
    }
  }

  // После ночи
  async afterNight() {
    const { room, game } = this

    // Беру все выстрелы
    const shots = await GameStep.findAll({
      where: {
        gameId: game.id,
        day: game.day,
        stepType: GameStep.stepTypes.NIGHT,
      },
    })

    // Беру всех мафиози, которые ещё в игре
    const mafiaPlayers = this.players.filter(
      (p) =>
        p.roleId == Game.roles.MAFIA &&
        p.status == GamePlayer.playerStatuses.IN_GAME
    )

    // количество выстрелов равно количеству мафиози
    if (shots.length == mafiaPlayers.length) {
      // Количество выстрелов в первого игрока
      const goodShots = shots.filter((s) => s.playerId == shots[0].playerId)

      // Все мафиози выстрелили в одгого игрока - игрок убит
      if (goodShots.length == shots.length) {
        await this.playerKilled(shots[0].playerId)
      }
      // Мафия промахнулась
      else {
        this.missmatch()
      }
    } else {
      await this.missmatch()
    }

    // Проверка на завершение игры
    const winnerSide = await this.isOver()
    if (winnerSide) {
      return await this.gameOver(winnerSide)
    }

    // если игра не окончена, идём дальше
    await this.nextDay()
  }

  // Функция определяет кто отправиться в тюрьму
  async voteResults() {
    const { game } = this

    // Беру ходы
    const steps = await GameStep.findAll({
      where: {
        gameId: game.id,
        day: game.day,
        stepType: GameStep.stepTypes.DAY,
      },
      attributes: ['playerId'],
    })

    const votes = {}
    let maxVotes = 0

    // id игрока - претендента на посадку
    let zekId = null

    // Заполняю массив голосования
    steps.forEach((step) => {
      if (!votes[step.playerId]) votes[step.playerId] = 0
      votes[step.playerId] += 1
      if (votes[step.playerId] > maxVotes) {
        maxVotes = votes[step.playerId]
        zekId = step.playerId
      }
    })

    // Количество живых игроков
    const activePlayers = this.activePlayersCount()

    // Если нет голосов
    if (!zekId) {
      // смотрю, не осталось ли в игре всего двух игроков
      // тогда посадка автоматический выбирается из них

      if (activePlayers > 2) return null

      for (let index in this.players) {
        const player = this.players[index]

        if (
          player.status != GamePlayer.playerStatuses.IN_GAME &&
          player.status != GamePlayer.playerStatuses.FREEZED
        )
          continue
        player.playerId = player.accountId
        steps.push(player)
        votes[player.accountId] = 1
      }
      maxVotes = 1
    }

    // Смотрю, есть ли другой игрок с таким же количеством голосов
    for (const playerId in votes) {
      if (playerId == zekId) continue

      const votesCount = votes[playerId]

      if (votesCount == maxVotes) {
        // Такой игрок найден
        // Это означает что тут либо омон, либо никто не садиться

        const mafiaCount = this.liveMafiaCount()

        // Все голоса распределены
        if (activePlayers == steps.length) {
          // Половина игроков - мафия
          if (mafiaCount * 2 == activePlayers && votesCount == mafiaCount) {
            // Тогда посадка определяется слуйчаным образом

            await this.systemMessage(
              'Силы равны. Бросаем жребий, чтобы определить, кто отправиться в тюрьму'
            )

            const rnd = Math.floor(Math.random() * activePlayers)
            return steps[rnd].playerId
          }
        }

        await this.systemMessage(
          'Равенство голосов. В тюрьму никто не отправляется'
        )

        // Никто не садиться (равенство голосов)
        return null
      }
    }

    // Если все проголосовали, то игрок садиться
    if (activePlayers == steps.length) return zekId

    // Если режим "по большинству голосов" (без добивов)
    if (game.mode == 1) {
      // Количество голосов должно быть больше половины
      if (maxVotes * 2 <= activePlayers) {
        await this.systemMessage(
          'Ни один из игроков не набрал большинства голосов.'
        )
        return null
      }
    }

    return zekId
  }

  // Игрок убит
  async playerKilled(playerId) {
    const killed = this.getPlayerById(playerId)

    killed.status = GamePlayer.playerStatuses.KILLED
    await killed.save()

    const role = await killed.getRole()

    await this.systemMessage(
      `${role.name} <b>${killed.username}</b> ${
        killed.account.gender == 2 ? 'убита' : 'убит'
      } мафией.`
    )

    // Если убит комиссар - надо посмотреть есть ли в игре сержант
    // Если есть, то передаю роль комиссара ему
    if (role.id == Game.roles.KOMISSAR) await this.updateSergeant()

    // Показываю всем роль убитого игрока
    await this.showPlayerRole(killed, GamePlayer.playerStatuses.KILLED)
  }

  // Промах мафии
  async missmatch() {
    await this.systemMessage('Мафия никого не убила.')
  }
}

module.exports = GameClassic
