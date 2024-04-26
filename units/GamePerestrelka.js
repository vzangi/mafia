const AccountThing = require('../models/AccountThing')
const Game = require('../models/Game')
const GameLife = require('../models/GameLife')
const GameLog = require('../models/GameLog')
const GamePlayer = require('../models/GamePlayer')
const GameStep = require('../models/GameStep')
const Thing = require('../models/Thing')
const GameBase = require('./GameBase')
const sequelize = require('./db')
const log = require('./customLog')
const GameEvent = require('../models/GameEvent')
const Account = require('../models/Account')

// Игра в классическом режиме
class GamePerestrelka extends GameBase {
  // Получаю доступные роли
  async getAvailableRoles() {
    const { players } = this
    const playersInGame = players.length

    // Возвращаю доступные роли в зависимости от количества игроков в партии
    switch (playersInGame) {
      case 3:
        return [[Game.roles.MAFIA, 1]]
      case 4:
      case 5:
        return [
          [Game.roles.MAFIA, 1],
          [Game.roles.CHILD, 1],
          [Game.roles.MANIAC, 1],
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
          [Game.roles.CHILD, 1],
          [Game.roles.MANIAC, 1],
        ]
      case 12:
      case 13:
      case 14:
      case 15:
      case 16:
      case 17:
        return [
          [Game.roles.MAFIA, 3],
          [Game.roles.KOMISSAR, 1],
          [Game.roles.SERGEANT, 1],
          [Game.roles.CHILD, 1],
          [Game.roles.MANIAC, 1],
          [Game.roles.DOCTOR, 1],
        ]
    }

    // 18 и больше
    return [
      [Game.roles.MAFIA, 4],
      [Game.roles.KOMISSAR, 1],
      [Game.roles.SERGEANT, 1],
      [Game.roles.CHILD, 1],
      [Game.roles.MANIAC, 1],
      [Game.roles.DOCTOR, 1],
      [Game.roles.LOVER, 1],
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
      log(error)
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

    // Если игрока отвлекает любовница
    if (voter.status == GamePlayer.playerStatuses.FREEZED) {
      throw new Error(
        'Любовница заманила вас в свои сети и не даёт возможности проголосовать'
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

    const voterPower = await AccountThing.getPower(voter.accountId)
    const playerPower = await AccountThing.getPower(player.accountId)

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

    const msg = `<b><span class='user voter'>${voter.username}</span> ${
      voter.account.gender == Account.genders.FEMALE
        ? 'нанесла'
        : voter.account.gender == Account.genders.MALE
        ? 'нанёс'
        : 'нанес(ла)'
    } <span class='user pretendent'>${username}</span> урон <span class='uron'>-${uron}</span></b>`
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

    const maxVotes = await GameStep.findOne({
      where: {
        gameId: game.id,
        day,
        stepType: GameStep.stepTypes.DAY,
      },
      attributes: [[sequelize.fn('count', 'id'), 'cnt'], 'playerId'],
      group: ['playerId'],
      order: [['cnt', 'desc']],
    })

    // Если режим, в котором игроки не ждут всех ходов
    if (game.mode == 1) {
      // Количество сделавших ход игроков больше половины оставшихся в игре
      if (maxVotes.get('cnt') * 2 > playersInGame) {
        // Завершаю голосование
        game.deadline = 0
        return
      }
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

      // Событие - факт первой посадки
      await this.makeFirstFact(player.accountId, GameEvent.factEvents.FIRST_ZEK)

      const role = await player.getRole()

      const msg = `<b><span class='role role-${role.id}'>${role.name}</span> <span class='user zek role-${role.id}'>${player.username}</span> отправляется в госпиталь.</b>`

      await this.systemMessage(msg)
      this.systemLog(msg)

      // Если посажен комиссар - надо посмотреть есть ли в игре сержант
      // Если есть, то передаю роль комиссара ему
      if (role.id == Game.roles.KOMISSAR) await this.updateSergeant()

      // Если посажена любовница, то размораживаю игрока
      if (role.id == Game.roles.LOVER) {
        await this.unfreez()
      }

      // Показываю роль посаженного игрока всем
      await this.showPlayerRole(player, GamePlayer.playerStatuses.PRISONED)
    }

    // Проверка на окончание игры
    const winnerSide = await this.isOver()
    if (winnerSide) {
      await this.gameOver(winnerSide)
      return
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

    // Смотрю, есть ли в игре любовница
    const puatanaInGame = this.getPlayerByRoleId(Game.roles.LOVER)
    if (puatanaInGame) {
      rolesInNight += ', любовницы'
    }

    await this.systemMessage('<hr>')
    await this.systemMessage(`Наступила ночь. ${rolesInNight}.`)

    this.systemLog(`<hr>Наступила ночь. ${rolesInNight}.`)

    if (this.noVictim()) {
      await this.systemMessage(`Мафии некого убивать.`)
      this.systemLog(`Мафии некого убивать.`)

      await this.nextDay()
      return
    }

    // Если был замороженный любовницей игрок, то размораживаю его
    await this.unfreez()

    // Ход мафии
    await this.setPeriod(Game.periods.NIGHT, periodInterval)

    // Запускаю ход мафии
    room.emit('mafia.start')
  }

  // Выстрел мафии / маньяка / любовницы
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
        throw new Error('Любовница заманила вас в свои сети')
      }

      await this.maniacShot(player, shooter)
    }

    // Ход любовницы
    if (shooter.roleId == Game.roles.LOVER) {
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

    const mafPower = await AccountThing.getPower(maf.accountId)
    const playerPower = await AccountThing.getPower(player.accountId)

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
          socket.emit('nightlife', player.username, playerLife.life)
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

    const maniacPower = await AccountThing.getPower(maniac.accountId)
    const playerPower = await AccountThing.getPower(player.accountId)

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

    // Записываю ход любовницы в базу
    await GameStep.create(data)

    // Если игрок не мафия
    if (player.roleId != Game.roles.MAFIA) {
      // Ставлю игроку статус - заморожен
      player.status = GamePlayer.playerStatuses.FREEZED
      await player.save()

      // Событие - любовница морозит игрока
      await this.makeAction(
        [Game.roles.LOVER],
        GameEvent.actionEvents.LOVER_FREEZ
      )

      const sockets = this.getUserSocketIds(player.accountId, '/game')
      sockets.forEach((socket) => {
        socket.emit('freez')
      })
    }

    this.systemLog(
      `<b>Любовница ${putana.username} отвлекает ${player.username}</b>`,
      GameLog.types.FREEZ,
      true
    )
  }

  // После ночи
  async afterNight() {
    const { game, players } = this

    // Беру все выстрелы мафов
    const shots = await GameStep.findAll({
      where: {
        gameId: game.id,
        day: game.day,
        stepType: GameStep.stepTypes.NIGHT,
      },
    })

    // Лечение врача
    const docSave = await GameStep.findOne({
      where: {
        gameId: game.id,
        day: game.day,
        stepType: GameStep.stepTypes.THERAPY,
      },
    })

    let hasSave = false

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

      // Врач лечил игрока, в которого стрелял маф
      if (!hasSave && docSave && docSave.playerId == player.accountId) {
        // Врач может спасать только от одного выстрела
        hasSave = true

        // Расчитываю велчину ночной жизни
        const docPower = await AccountThing.getPower(docSave.accountId)
        const playerPower = await AccountThing.getPower(player.accountId)
        playerLife.life += Math.ceil((100 + docPower - playerPower) / 4)
        if (playerLife.life > 100) playerLife.life = 100

        // Увеличиваю уровень ночных жизней
        await playerLife.save()

        // Уведомляю всех мафов о лечении
        for (const index in players) {
          const plr = players[index]
          if (plr.roleId == Game.roles.MAFIA) {
            const sockets = this.getUserSocketIds(plr.accountId)
            sockets.forEach((socket) => {
              socket.emit('nightlife', player.username, playerLife.life)
            })
          }
        }
      }

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
      await this.gameOver(winnerSide)
      return
    }

    // если игра не окончена, идём дальше
    await this.nextDay()
  }

  // Игрок убит мафией
  async playerKilled(playerId) {
    const killed = this.getPlayerById(playerId)

    // Если игрок уже убит - выхожу
    if (killed.status == GamePlayer.playerStatuses.KILLED) {
      return
    }

    killed.status = GamePlayer.playerStatuses.KILLED
    await killed.save()

    // Событие - маф убил игрока
    await this.makeAction([Game.roles.MAFIA], GameEvent.actionEvents.MAF_KILL)

    // Событие - факт первый труп
    await this.makeFirstFact(killed.accountId, GameEvent.factEvents.FIRST_CORSE)

    const role = await killed.getRole()

    const msg = `<b><span class='role role-${role.id}'>${
      role.name
    }</span> <span class='user trup role-${role.id}'>${
      killed.username
    }</span> ${
      killed.account.gender == Account.genders.FEMALE
        ? 'убита'
        : killed.account.gender == Account.genders.MALE
        ? 'убит'
        : 'убит(а)'
    } мафией.</b>`

    await this.systemMessage(msg)
    this.systemLog(msg)

    // Если убит комиссар - надо посмотреть есть ли в игре сержант
    // Если есть, то передаю роль комиссара ему
    if (role.id == Game.roles.KOMISSAR) await this.updateSergeant()

    // Если убита любовница, то размораживаю игрока
    if (role.id == Game.roles.LOVER) {
      await this.unfreez()
    }

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

    const msg = `<b><span class='role role-${role.id}'>${
      role.name
    }</span> <span class='user trup role-${role.id}'>${
      killed.username
    }</span> ${
      killed.account.gender == Account.genders.FEMALE
        ? 'убита'
        : killed.account.gender == Account.genders.MALE
        ? 'убит'
        : 'убит(а)'
    } маньяком.</b>`

    await this.systemMessage(msg)

    // Событие - ман убил игрока
    await this.makeAction(
      [Game.roles.MANIAC],
      GameEvent.actionEvents.MAN_KILL,
      true
    )

    // Если убит комиссар - надо посмотреть есть ли в игре сержант
    // Если есть, то передаю роль комиссара ему
    if (role.id == Game.roles.KOMISSAR) await this.updateSergeant()

    // Если убита любовница, то размораживаю игрока
    if (role.id == Game.roles.LOVER) {
      await this.unfreez()
    }

    // Показываю всем роль убитого игрока
    await this.showPlayerRole(killed, GamePlayer.playerStatuses.KILLED)

    this.systemLog(msg)
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

    // Расчитываю уровень на который врач может спасти игрока
    const docPower = await AccountThing.getPower(doc.accountId)
    const playerPower = await AccountThing.getPower(player.accountId)
    const save = Math.ceil((100 + docPower - playerPower) / 4)

    this.systemLog(
      `<b>Врач ${doc.username} пытается спасти ${player.username} на +${save}</b>`,
      GameLog.types.DOC,
      true
    )
  }
}

module.exports = GamePerestrelka
