const AccountThing = require('../models/AccountThing')
const Game = require('../models/Game')
const GameLife = require('../models/GameLife')
const GameLog = require('../models/GameLog')
const GamePlayer = require('../models/GamePlayer')
const GameStep = require('../models/GameStep')
const Thing = require('../models/Thing')
const GameBase = require('./GameBase')

// Игра в классическом режиме
class GamePerestrelka extends GameBase {
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
          [Game.roles.CHILD, 1],
          [Game.roles.KOMISSAR, 1],
        ]
      case 6:
        return [
          [Game.roles.MAFIA, 2],
          [Game.roles.CHILD, 1],
          [Game.roles.KOMISSAR, 1],
          [Game.roles.MANIAC, 1],
        ]
      case 7:
      case 8:
      case 9:
        return [
          [Game.roles.MAFIA, 2],
          [Game.roles.CHILD, 1],
          [Game.roles.KOMISSAR, 1],
          [Game.roles.MANIAC, 1],
          [Game.roles.DOCTOR, 1],
        ]
      case 10:
      case 11:
        return [
          [Game.roles.MAFIA, 2],
          [Game.roles.KOMISSAR, 1],
          [Game.roles.CHILD, 1],
          [Game.roles.MANIAC, 1],
          [Game.roles.DOCTOR, 1],
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
          [Game.roles.CHILD, 1],
          [Game.roles.MANIAC, 1],
          [Game.roles.DOCTOR, 1],
          [Game.roles.PROSTITUTE, 1],
        ]
    }

    // 17 и больше
    return [
      [Game.roles.MAFIA, 4],
      [Game.roles.KOMISSAR, 1],
      [Game.roles.SERGEANT, 1],
      [Game.roles.CHILD, 1],
      [Game.roles.MANIAC, 1],
      [Game.roles.DOCTOR, 1],
      [Game.roles.PROSTITUTE, 1],
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

  // Перегружаю базовую функцию подготовки
  async prepare() {
    // Вызываю подготовку из базового класса
    const parentPrepare = await super.prepare()

    // Если подготовка не удалась - выхожу
    if (!parentPrepare) return false

    const hasManiac = this.getPlayerByRoleId(Game.roles.MANIAC)

    try {
      const { players } = this
      // Добавляю дневные и ночные статы каждому игроку
      for (const index in players) {
        const player = players[index]
        // Дневные жизни
        await GameLife.create({
          gameplayerId: player.id,
          type: GameLife.types.DAY,
        })

        // Ночные жизни для выстрелов мафии
        await GameLife.create({
          gameplayerId: player.id,
          type: GameLife.types.NIGHT,
        })

        // Если в игре есть маньяк
        if (hasManiac) {
          // Создаю ночные жизни для выстрелов маньяка
          await GameLife.create({
            gameplayerId: player.id,
            type: GameLife.types.MANIAC,
          })
        }
      }
      return true
    } catch (error) {
      console.log(error)
      return false
    }
  }

  // Новый день
  async nextDay() {
    const { game, room, periodInterval } = this

    // Увеличиваю номер дня
    game.day += 1

    await this.systemMessage('<hr>')
    await this.systemMessage(`День ${game.day}. Началась перестрелка.`)

    this.systemLog(`<hr>День ${game.day}. Началась перестрелка.`)

    // Следующий период - день
    await this.setPeriod(Game.periods.DAY, periodInterval)

    // Начало голосования
    room.emit('voting.start', game.day)
  }

  // Перегружаю функцию голосования
  async vote(username, voterId) {
    const voter = this.getPlayerById(voterId)
    if (!voter) {
      throw new Error('Вас нет в этой игре')
    }

    // Если игрока отвлекает путана
    if (voter.status == GamePlayer.playerStatuses.FREEZED) {
      throw new Error(
        'Путана заманила вас в свои сети и не даёт возможности проголосовать'
      )
    }

    // Игрок должен иметь активный статус (в игре)
    if (voter.status != GamePlayer.playerStatuses.IN_GAME) {
      return
    }

    const player = this.getPlayerByName(username)

    if (!player) {
      throw new Error('Игрок не найден в этой игре')
    }

    if (
      player.status != GamePlayer.playerStatuses.IN_GAME &&
      player.status != GamePlayer.playerStatuses.FREEZED
    ) {
      throw new Error('Нельза голосовать в выбывшего игрока')
    }

    const { game, room } = this
    const { period, day } = game

    if (period != Game.periods.DAY) {
      throw new Error('Голосование окончено')
    }

    // Ищу свой голос в этот день
    const haveVote = await GameStep.findOne({
      where: {
        gameId: game.id,
        accountId: voterId,
        day: day,
        stepType: GameStep.stepTypes.DAY,
      },
    })

    // Если уже голосовал
    if (haveVote) {
      throw new Error('Вы уже проголосовали')
    }

    // Записываю голос в базу
    await GameStep.create({
      gameId: game.id,
      accountId: voterId,
      playerId: player.accountId,
      day: day,
      stepType: GameStep.stepTypes.DAY,
    })

    const voterPower = await this.getPower(voter)
    const playerPower = await this.getPower(player)

    // Расчитываю урон
    const uron = Math.ceil((100 + voterPower - playerPower) / 4)

    const playerLife = await GameLife.findOne({
      where: {
        gameplayerId: player.id,
        type: GameLife.types.DAY,
      },
    })

    // Отнимаю урон у игрока
    playerLife.life -= uron
    if (playerLife.life < 0) playerLife.life = 0
    playerLife.save()

    const msg = `<b>${voter.username} нанёс ${username} урон -${uron}</b>`
    this.systemMessage(msg)
    this.systemLog(msg, GameLog.types.STEP)

    // Уведомляю всех о голосе
    room.emit('vote', voter.username, username, playerLife.life)

    // Проверяю, можно ли завершать голосование

    const steps = await GameStep.findAll({
      where: {
        gameId: game.id,
        day,
        stepType: GameStep.stepTypes.DAY,
      },
    })

    const playersInGame = this.activePlayersCount()

    // Количество ходов равно количеству игроков
    if (steps.length == playersInGame) {
      // Завершаю голосование
      game.deadline = 0
      return
    }
  }

  // После дня
  async afterDay() {
    const { room, game } = this

    // останавливаю голосование
    room.emit('voting.stop')
    await this.systemMessage('Перестрелка окончена.')

    this.systemLog('Перестрелка окончена.')

    const deadPlayers = await GameLife.findAll({
      where: {
        type: GameLife.types.DAY,
        life: 0,
      },
      include: [
        {
          model: GamePlayer,
          where: {
            gameId: game.id,
            status: [
              GamePlayer.playerStatuses.IN_GAME,
              GamePlayer.playerStatuses.FREEZED,
            ],
          },
        },
      ],
    })

    // Прохожу по каждому выбывшему игроку
    for (const index in deadPlayers) {
      const player = this.getPlayerById(deadPlayers[index].gameplayer.accountId)

      // Меняю статус игрока на "в тюрьме"
      player.status = GamePlayer.playerStatuses.PRISONED
      await player.save()

      const role = await player.getRole()

      await this.systemMessage(
        `<b>${role.name} ${player.username} отправляется в госпиталь.</b>`
      )
      this.systemLog(
        `<b>${role.name} ${player.username} отправляется в госпиталь.</b>`
      )

      // Если посажен комиссар - надо посмотреть есть ли в игре сержант
      // Если есть, то передаю роль комиссара ему
      if (role.id == Game.roles.KOMISSAR) await this.updateSergeant()

      // Если посажена путана, то размораживаю игрока
      if (role.id == Game.roles.PROSTITUTE) {
        await this.unfreez()
      }

      // Показываю роль посаженного игрока всем
      await this.showPlayerRole(player, GamePlayer.playerStatuses.PRISONED)

      // Проверка на окончание игры
      const winnerSide = await this.isOver()
      if (winnerSide) {
        return await this.gameOver(winnerSide)
      }
    }

    // Если ком ещё в игре
    if (this.komInGame()) {
      const hasUnlooked = await this.hasUnlookedPlayers()

      // Если есть непроверенные игроки
      if (hasUnlooked) {
        // то идёт проверка кома
        await this.komStep()
        return
      }

      this.systemMessage('Комиссар окончил своё расследование.')
      this.systemLog('Комиссар окончил своё расследование.')
    }

    // Ход мафии
    await this.mafiaStep()
  }

  // Ход кома
  async komStep() {
    const { room, periodInterval } = this

    await this.systemMessage('<hr>')
    await this.systemMessage('Ход комиссара.')

    this.systemLog('<hr>Ход комиссара.')

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

    let rolesInNight = 'Ход мафии'

    // Смотрю, есть ли в игре маньяк
    const manInGame = this.getPlayerByRoleId(Game.roles.MANIAC)
    if (manInGame && manInGame.status != GamePlayer.playerStatuses.FREEZED) {
      rolesInNight += ', маньяка'
    }

    // Смотрю, есть ли в игре врач
    const docInGame = this.getPlayerByRoleId(Game.roles.DOCTOR)
    if (docInGame && docInGame.status != GamePlayer.playerStatuses.FREEZED) {
      rolesInNight += ', врача'
    }

    // Смотрю, есть ли в игре путана
    const puatanaInGame = this.getPlayerByRoleId(Game.roles.PROSTITUTE)
    if (puatanaInGame) {
      rolesInNight += ', путаны'
    }

    await this.systemMessage('<hr>')
    await this.systemMessage(`Наступила ночь. ${rolesInNight}.`)

    this.systemLog(`<hr>Наступила ночь. ${rolesInNight}.`)

    // Если был замороженный путаной игрок, то размораживаю его
    await this.unfreez()

    // Ход мафии
    await this.setPeriod(Game.periods.NIGHT, periodInterval)

    // Запускаю ход мафии
    room.emit('mafia.start')
  }

  // Выстрел мафии / маньяка / путаны
  async shot(username, mafId) {
    const { game } = this
    const player = this.getPlayerByName(username)

    if (!player) {
      throw new Error('Игрок не найден')
    }

    if (game.period != Game.periods.NIGHT) {
      throw new Error('Не время стрелять')
    }

    const shooter = this.getPlayerById(mafId)

    if (!shooter) {
      throw new Error('Такого стрелка нет в игре')
    }

    if (shooter.status != GamePlayer.playerStatuses.IN_GAME) {
      throw new Error('Вы уже выбыли из игры')
    }

    if (player.accountId == shooter.accountId) {
      throw new Error('Нельзя стрелять в себя')
    }

    // Стрелок - маф
    if (shooter.roleId == Game.roles.MAFIA) {
      await this.mafiaShot(player, shooter)
    }

    // Стрелок - маньяк
    if (shooter.roleId == Game.roles.MANIAC) {
      if (shooter.status == GamePlayer.playerStatuses.FREEZED) {
        throw new Error('Путана заманила вас в свои сети')
      }

      await this.maniacShot(player, shooter)
    }

    // Ход путаны
    if (shooter.roleId == Game.roles.PROSTITUTE) {
      await this.freezing(player, shooter)
    }
  }

  // Выстрел
  async mafiaShot(player, maf) {
    const { game, players } = this

    const isShooting = await GameStep.findOne({
      where: {
        gameId: game.id,
        day: game.day,
        accountId: maf.accountId,
        stepType: GameStep.stepTypes.NIGHT,
      },
    })

    if (isShooting) {
      throw new Error('Вы уже стреляли этой ночью')
    }

    // Записываю выстрел в базу
    await GameStep.create({
      gameId: game.id,
      day: game.day,
      accountId: maf.accountId,
      playerId: player.accountId,
      stepType: GameStep.stepTypes.NIGHT,
    })

    const mafPower = await this.getPower(maf)
    const playerPower = await this.getPower(player)

    // Рассчитываю урон
    const uron = Math.ceil((100 + mafPower - playerPower) / 2)

    const playerLife = await GameLife.findOne({
      where: {
        gameplayerId: player.id,
        type: GameLife.types.NIGHT,
      },
    })

    // Отнимаю урон у игрока
    playerLife.life -= uron
    if (playerLife.life < 0) playerLife.life = 0
    playerLife.save()

    const msg = `<b>Мафия ${maf.username} наносит ${player.username} урон -${uron}</b>`
    this.systemLog(msg, GameLog.types.MAF, true)

    // Уведомляю всех мафов об уроне
    for (const index in players) {
      const plr = players[index]
      if (plr.roleId == Game.roles.MAFIA) {
        const sockets = this.getUserSocketIds(plr.accountId)
        sockets.forEach((socket) => {
          socket.emit('shot', player.username, playerLife.life)
        })
      }
    }

    // беру все выстрелы
    const shots = await GameStep.findAll({
      where: {
        gameId: game.id,
        day: game.day,
        stepType: GameStep.stepTypes.NIGHT,
      },
    })

    // Беру всех мафов, которые ещё в игре
    const mafiaPlayers = players.filter(
      (p) =>
        p.roleId == Game.roles.MAFIA &&
        p.status == GamePlayer.playerStatuses.IN_GAME
    )

    // Количество выстрелов равно количеству мафиози
    if (shots.length == mafiaPlayers.length) {
      // Завершаю ночь
      game.deadline = 0
    }
  }

  // Выстрел
  async maniacShot(player, maniac) {
    const { game, players } = this

    const data = {
      gameId: game.id,
      day: game.day,
      accountId: maniac.accountId,
      stepType: GameStep.stepTypes.KILLING,
    }

    const isShooting = await GameStep.findOne({ where: data })

    if (isShooting) {
      throw new Error('Вы уже стреляли этой ночью')
    }

    data.playerId = player.accountId

    // Записываю выстрел в базу
    await GameStep.create(data)

    const maniacPower = await this.getPower(maniac)
    const playerPower = await this.getPower(player)

    // Рассчитываю урон
    const uron = Math.ceil((100 + maniacPower - playerPower) / 2)

    const playerLife = await GameLife.findOne({
      where: {
        gameplayerId: player.id,
        type: GameLife.types.MANIAC,
      },
    })

    // Отнимаю урон у игрока
    playerLife.life -= uron
    if (playerLife.life < 0) playerLife.life = 0
    playerLife.save()

    const msg = `<b>Маньяк ${maniac.username} наносит ${player.username} урон -${uron}</b>`
    this.systemLog(msg, GameLog.types.MAF, true)

    // Уведомляю маньяка об уроне
    for (const index in players) {
      const plr = players[index]
      if (plr.roleId == Game.roles.MANIAC) {
        const sockets = this.getUserSocketIds(plr.accountId)
        sockets.forEach((socket) => {
          socket.emit('manshot', player.username, playerLife.life)
        })
      }
    }
  }

  // Заморозка игрока
  async freezing(player, putana) {
    const { game } = this

    const data = {
      gameId: game.id,
      day: game.day,
      accountId: putana.accountId,
      stepType: GameStep.stepTypes.FREEZING,
    }

    const isFreezing = await GameStep.findOne({ where: data })

    if (isFreezing) {
      throw new Error('Вы уже ходили этой ночью')
    }

    data.playerId = player.accountId

    // Записываю ход путаны в базу
    await GameStep.create(data)

    // Если игрок не мафия
    if (player.roleId != Game.roles.MAFIA) {
      // Ставлю игроку статус - заморожен
      player.status = GamePlayer.playerStatuses.FREEZED
      await player.save()

      const sockets = this.getUserSocketIds(player.accountId, '/game')
      sockets.forEach((socket) => {
        socket.emit('freez')
      })
    }

    this.systemLog(
      `<b>Путана ${putana.username} отвлекает ${player.username}</b>`,
      GameLog.types.FREEZ,
      true
    )
  }

  // Переход после хода мафии
  async transition() {
    const { room } = this

    // Завершаю ход мафии
    room.emit('mafia.stop')

    await this.systemMessage('<hr>')
    await this.systemMessage('Внимание! Считаем трупы на рассвете.')

    this.systemLog('<hr>Внимание! Считаем трупы на рассвете.')

    // Проверяю наличие кома в игре
    if (this.komInGame()) {
      // Если он есть, то даю 6 секунд на то, чтобы выдать проверку
      await this.setPeriod(Game.periods.TRANSITION, this.perehodInterval)
    } else {
      await this.afterNight()
    }
  }

  // После ночи
  async afterNight() {
    const { game } = this

    // Беру все выстрелы мафов
    const shots = await GameStep.findAll({
      where: {
        gameId: game.id,
        day: game.day,
        stepType: GameStep.stepTypes.NIGHT,
      },
    })

    // Прохожусь по игрокам, в которых были выстрелы мафов
    for (const index in shots) {
      const shot = shots[index]

      const player = this.getPlayerById(shot.playerId)

      // Смотрю ночные жизни игрока
      const playerLife = await GameLife.findOne({
        where: {
          gameplayerId: player.id,
          type: GameLife.types.NIGHT,
        },
      })

      // Игрок убит
      if (playerLife.life == 0) {
        await this.playerKilled(player.accountId)
      } else {
        const manUronLife = await GameLife.findOne({
          where: {
            gameplayerId: player.id,
            type: GameLife.types.MANIAC,
          },
        })

        if (manUronLife) {
          // Суммарный урон от мафов и маньяка больше 100
          if (playerLife.life + manUronLife.life <= 100) {
            await this.playerKilled(player.accountId)
          }
        }
      }
    }

    // Беру выстрел маньяка
    const manShot = await GameStep.findOne({
      where: {
        gameId: game.id,
        day: game.day,
        stepType: GameStep.stepTypes.KILLING,
      },
    })

    if (manShot) {
      const player = this.getPlayerById(manShot.playerId)

      // Смотрю ночные жизни игрока
      const playerMLife = await GameLife.findOne({
        where: {
          gameplayerId: player.id,
          type: GameLife.types.MANIAC,
        },
      })

      // Игрок убит маньяком
      if (playerMLife.life == 0) {
        await this.playerKilledByManiac(manShot.playerId)
      } else {
        const mafUronLife = await GameLife.findOne({
          where: {
            gameplayerId: player.id,
            type: GameLife.types.NIGHT,
          },
        })

        // Суммарный урон от мафов и маньяка больше 100
        if (mafUronLife.life + playerMLife.life <= 100) {
          await this.playerKilledByManiac(manShot.playerId)
        }
      }
    }

    // Проверка на завершение игры
    const winnerSide = await this.isOver()
    if (winnerSide) {
      return await this.gameOver(winnerSide)
    }

    // если игра не окончена, идём дальше
    await this.nextDay()
  }

  // Игрок убит мафией
  async playerKilled(playerId) {
    const killed = this.getPlayerById(playerId)

    killed.status = GamePlayer.playerStatuses.KILLED
    await killed.save()

    const role = await killed.getRole()

    const msg = `<b>${role.name} ${killed.username} ${
      killed.account.gender == 2 ? 'убита' : 'убит'
    } мафией.</b>`
    await this.systemMessage(msg)

    this.systemLog(msg)

    // Если убит комиссар - надо посмотреть есть ли в игре сержант
    // Если есть, то передаю роль комиссара ему
    if (role.id == Game.roles.KOMISSAR) await this.updateSergeant()

    // Показываю всем роль убитого игрока
    await this.showPlayerRole(killed, GamePlayer.playerStatuses.KILLED)
  }

  // Игрок убит маньяком
  async playerKilledByManiac(playerId) {
    const killed = this.getPlayerById(playerId)

    // Если игрок уже выбыл - выхожу
    if (
      killed.status != GamePlayer.playerStatuses.IN_GAME &&
      killed.status != GamePlayer.playerStatuses.FREEZED
    ) {
      return
    }

    killed.status = GamePlayer.playerStatuses.KILLED
    await killed.save()

    const role = await killed.getRole()

    const msg = `<b>${role.name} ${killed.username} ${
      killed.account.gender == 2 ? 'убита' : 'убит'
    } маньяком.</b>`
    await this.systemMessage(msg)

    this.systemLog(msg)

    // Если убит комиссар - надо посмотреть есть ли в игре сержант
    // Если есть, то передаю роль комиссара ему
    if (role.id == Game.roles.KOMISSAR) await this.updateSergeant()

    // Показываю всем роль убитого игрока
    await this.showPlayerRole(killed, GamePlayer.playerStatuses.KILLED)
  }

  // Разморозка игрока
  async unfreez() {
    for (const index in this.players) {
      const player = this.players[index]
      if (player.status == GamePlayer.playerStatuses.FREEZED) {
        player.status = GamePlayer.playerStatuses.IN_GAME
        await player.save()

        const sockets = this.getUserSocketIds(player.accountId, '/game')
        sockets.forEach((socket) => {
          socket.emit('unfreez')
        })
      }
    }
  }

  // Защита игрока от выстрела мафии
  async therapy(username, docId) {
    const { game } = this

    if (game.period != Game.periods.NIGHT) {
      throw new Error('Не время лечить')
    }

    const player = this.getPlayerByName(username)

    if (!player) {
      throw new Error('Игрок не найден')
    }

    const doc = this.getPlayerById(docId)

    if (!doc) {
      throw new Error('Этот игрок не врач')
    }

    if (doc.status != GamePlayer.playerStatuses.IN_GAME) {
      throw new Error('Вы вне игры')
    }

    if (doc.roleId != Game.roles.DOCTOR) {
      throw new Error('Вы не врач')
    }

    if (player.accountId == doc.accountId) {
      throw new Error('Нельзя лечить себя')
    }

    const isProtect = await GameStep.findOne({
      where: {
        gameId: game.id,
        day: game.day,
        accountId: doc.accountId,
        stepType: GameStep.stepTypes.THERAPY,
      },
    })

    if (isProtect) {
      throw new Error('Вы уже лечили этой ночью')
    }

    // Записываю ход врача в базу
    await GameStep.create({
      gameId: game.id,
      day: game.day,
      accountId: doc.accountId,
      playerId: player.accountId,
      stepType: GameStep.stepTypes.THERAPY,
    })

    this.systemLog(
      `<b>Врач ${doc.username} спасает ${player.username}</b>`,
      GameLog.types.DOC,
      true
    )
  }

  // Вычисление мощности удара игрока
  async getPower(player) {
    // Загружаю вещи, которые игрок взял в игру
    const takedThings = await AccountThing.findAll({
      where: {
        accountId: player.accountId,
        taked: true,
      },
      include: [
        {
          model: Thing,
          where: {
            thingtypeId: 1, // Вещи
          },
        },
      ],
      limit: 5,
    })

    // Рассчитываю силу урона игрока
    let power = 0
    for (const thingIndex in takedThings) {
      const thing = takedThings[thingIndex]
      if (thing.thingclassId == 5) {
        power += 20
        continue
      }
      power += thing.thing.thingclassId * 5
    }

    return power
  }
}

module.exports = GamePerestrelka
