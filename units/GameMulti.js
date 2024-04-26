const Account = require('../models/Account')
const Game = require('../models/Game')
const GameEvent = require('../models/GameEvent')
const GameLog = require('../models/GameLog')
const GamePlayer = require('../models/GamePlayer')
const GameStep = require('../models/GameStep')
const GameBase = require('./GameBase')

// Игра в классическом режиме
class GameMulti extends GameBase {
  // Получаю доступные роли
  async getAvailableRoles() {
    const { players } = this
    const playersInGame = players.length

    // Возвращаю доступные роли в зависимости от количества игроков в партии
    switch (playersInGame) {
      case 3:
      case 4:
        return [
          [Game.roles.MAFIA, 1],
          [Game.roles.CHILD, 1],
        ]
      case 5:
        return [
          [Game.roles.MAFIA, 1],
          [Game.roles.CHILD, 1],
          [Game.roles.MANIAC, 1],
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
          [Game.roles.ADVOCATE, 1],
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
      [Game.roles.ADVOCATE, 1],
      [Game.roles.LOVER, 1],
    ]
  }

  // Вычисление следующего периода игры
  async nextPeriod() {
    const { game } = this

    if (game.period == Game.periods.START) {
      // Если ком есть в игре
      if (!game.firstday) {
        if (this.komInGame()) {
          await this.komStep()
        } else {
          await this.mafiaStep()
        }
      } else {
        await this.nextDay()
      }

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

    await this.systemMessage('<hr>')
    await this.systemMessage(`День ${game.day}. Игроки ищут мафию.`)

    this.systemLog(`<hr>День ${game.day}. Игроки ищут мафию.`)

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

    this.systemLog('Голосование окончено. Считаем голоса.')

    // Проверяю результаты голосования
    const zek = await this.voteResults()

    // если голосование не выявило посадку, то наступает новый день и снова идёт голосование
    if (!zek) {
      await this.systemMessage(
        'Договориться не удалось. Голосование продолжается.'
      )
      this.systemLog('Договориться не удалось. Голосование продолжается.')

      await this.nextDay()
      return
    }

    // Тут надо проверить, есть ли в игре адвокат
    // если есть, то узнать кого он защищал
    // если он защитил игрока, которого хотят посадить - он не садиться,
    // и запускается ход кома

    const hasAdvocate = this.getPlayerByRoleId(Game.roles.ADVOCATE)
    let wasProtection = false

    if (hasAdvocate) {
      const lastProtection = await GameStep.findOne({
        where: {
          gameId: this.game.id,
          stepType: GameStep.stepTypes.PROTECTION,
        },
        order: [['id', 'desc']],
      })

      if (lastProtection) {
        if (lastProtection.playerId == zek) {
          wasProtection = true
        }
      }
    }

    const player = this.getPlayerById(zek)

    if (!wasProtection) {
      // Меняю статус игрока на "в тюрьме"
      player.status = GamePlayer.playerStatuses.PRISONED
      await player.save()

      // Событие - факт первой посадки
      await this.makeFirstFact(player.accountId, GameEvent.factEvents.FIRST_ZEK)

      const role = await player.getRole()

      const msg = `<b><span class='role role-${role.id}'>${role.name}</span> <span class='user zek role-${role.id}'>${player.username}</span> отправляется в тюрьму.</b>`
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

      // Проверка на окончание игры
      const winnerSide = await this.isOver()
      if (winnerSide) {
        await this.gameOver(winnerSide)
        return
      }
    } else {
      // Событие - адвокат спас игрока от посадки
      await this.makeAction(
        [Game.roles.ADVOCATE],
        GameEvent.actionEvents.ADV_SAVE
      )

      const message = `<b>Адвокат выступил на стороне ${player.username} и защитил его от тюрьмы.</b>`
      await this.systemMessage(message)

      this.systemLog(message)
    }

    // Если ком ещё в игре
    if (this.komInGame()) {
      const hasUnlooked = await this.hasUnlookedPlayers()

      // Если есть непроверенные игроки
      if (hasUnlooked) {
        // то идёт проверка кома
        await this.komStep()
      } else {
        const kommsg = 'Комиссар окончил своё расследование.'
        this.systemMessage(kommsg)
        this.systemLog(kommsg)

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

    // Смотрю, есть ли в игре адвокат
    const advocateInGame = this.getPlayerByRoleId(Game.roles.ADVOCATE)
    if (
      advocateInGame &&
      advocateInGame.status != GamePlayer.playerStatuses.FREEZED
    ) {
      rolesInNight += ', адвоката'
    }

    // Смотрю, есть ли в игре любовница
    const puatanaInGame = this.getPlayerByRoleId(Game.roles.LOVER)
    if (
      puatanaInGame &&
      puatanaInGame.status != GamePlayer.playerStatuses.FREEZED
    ) {
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

  // После ночи
  async afterNight() {
    const { game } = this

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
        // Ищу спасение игрока врачом
        const wasProtected = await GameStep.findOne({
          where: {
            gameId: game.id,
            day: game.day,
            playerId: shots[0].playerId,
            stepType: GameStep.stepTypes.THERAPY,
          },
        })

        if (!wasProtected) {
          // Врач не спас игрока - он убит
          await this.playerKilled(shots[0].playerId)
        } else {
          // Событие - Врач спас игрока
          await this.makeAction(
            [Game.roles.DOCTOR],
            GameEvent.actionEvents.DOC_SAVE
          )

          const msg = 'Мафия покушалась на игрока, но врач спас его.'
          await this.systemMessage(msg)
          this.systemLog(msg)
        }
      }
      // Мафия промахнулась
      else {
        await this.missmatch()
      }
    } else {
      await this.missmatch()
    }

    // Беру выстрел маньяка
    const manShots = await GameStep.findAll({
      where: {
        gameId: game.id,
        day: game.day,
        stepType: GameStep.stepTypes.KILLING,
      },
    })

    for (const index in manShots) {
      await this.playerKilledByManiac(manShots[index].playerId)
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

        const mafiaCount = this.liveMafiaCount() + this.liveOtherMafiaCount()

        // Все голоса распределены
        if (activePlayers == steps.length) {
          // Половина игроков - мафия
          if (mafiaCount * 2 == activePlayers && votesCount == mafiaCount) {
            // Тогда посадка определяется слуйчаным образом

            await this.systemMessage(
              'Силы равны. Бросаем жребий, чтобы определить, кто отправиться в тюрьму.'
            )

            this.systemLog(
              'Силы равны. Бросаем жребий, чтобы определить, кто отправиться в тюрьму.'
            )

            const rnd = Math.floor(Math.random() * activePlayers)
            return steps[rnd].playerId
          }
        }

        // await this.systemMessage(
        //   'Равенство голосов. В тюрьму никто не отправляется.'
        // )

        // this.systemLog('Равенство голосов. В тюрьму никто не отправляется.')

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
        this.systemLog('Ни один из игроков не набрал большинства голосов.')
        return null
      }
    }

    return zekId
  }

  // Игрок убит мафией
  async playerKilled(playerId) {
    const killed = this.getPlayerById(playerId)

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

  // Промах мафии
  async missmatch() {
    // Событие - маф промазал
    await this.makeAction([Game.roles.MAFIA], GameEvent.actionEvents.MAF_MISS)

    await this.systemMessage('Мафия никого не убила.')
    this.systemLog('Мафия никого не убила.')
  }

  // Выстрел мафии / маньяка / адвоката / любовницы
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

    // Ход адвоката
    if (shooter.roleId == Game.roles.ADVOCATE) {
      if (shooter.status == GamePlayer.playerStatuses.FREEZED) {
        throw new Error('Любовница заманила вас в свои сети')
      }
      await this.protection(player, shooter)
    }

    // Ход любовницы
    if (shooter.roleId == Game.roles.LOVER) {
      await this.freezing(player, shooter)
    }
  }

  // Заморозка игрока
  async freezing(player, putana) {
    const { game } = this

    const isFreezing = await GameStep.findOne({
      where: {
        gameId: game.id,
        day: game.day,
        accountId: putana.accountId,
        stepType: GameStep.stepTypes.FREEZING,
      },
    })

    if (isFreezing) {
      throw new Error('Вы уже ходили этой ночью')
    }

    // Записываю ход любовницы в базу
    await GameStep.create({
      gameId: game.id,
      day: game.day,
      accountId: putana.accountId,
      playerId: player.accountId,
      stepType: GameStep.stepTypes.FREEZING,
    })

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

  // Защита адвоката
  async protection(player, advocate) {
    const { game } = this
    const { day } = game

    const isProtection = await GameStep.findOne({
      where: {
        gameId: game.id,
        day,
        accountId: advocate.accountId,
        stepType: GameStep.stepTypes.PROTECTION,
      },
    })

    if (isProtection) {
      throw new Error('Вы уже ходили этой ночью')
    }

    // Записываю защиту в базу
    await GameStep.create({
      gameId: game.id,
      day,
      accountId: advocate.accountId,
      playerId: player.accountId,
      stepType: GameStep.stepTypes.PROTECTION,
    })

    this.systemLog(
      `<b>Адвокат ${advocate.username} выступает на стороне ${player.username}</b>`,
      GameLog.types.ADV,
      true
    )
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

  // Выстрел мафии
  async mafiaShot(player, maf) {
    const { game } = this
    const { day } = game

    const isShooting = await GameStep.findOne({
      where: {
        gameId: game.id,
        day,
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
      day,
      accountId: maf.accountId,
      playerId: player.accountId,
      stepType: GameStep.stepTypes.NIGHT,
    })

    this.systemLog(
      `<b>Мафия ${maf.username} стреляет в ${player.username}</b>`,
      GameLog.types.MAF,
      true
    )

    // Смотрю все ли мафы стреляли
    await this.nightIsOver()
  }

  // Проверка на окончание ночи
  async nightIsOver() {
    const { game, players } = this
    const { day } = game

    // беру все выстрелы
    const shots = await GameStep.findAll({
      where: {
        gameId: game.id,
        day,
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
      // Здесь можно посмотреть, есть ли в игре маньяк
      // Если есть, то ждать его ход тоже

      // Завершаю ночь
      game.deadline = 0
    }
  }

  // Выстрел маньяка
  async maniacShot(player, maniac) {
    const { game } = this
    const { day } = game

    const isShooting = await GameStep.findOne({
      where: {
        gameId: game.id,
        day,
        accountId: maniac.accountId,
        stepType: GameStep.stepTypes.KILLING,
      },
    })

    if (isShooting) {
      throw new Error('Вы уже убивали этой ночью')
    }

    // Записываю выстрел в базу
    await GameStep.create({
      gameId: game.id,
      day,
      accountId: maniac.accountId,
      playerId: player.accountId,
      stepType: GameStep.stepTypes.KILLING,
    })

    this.systemLog(
      `<b>Маньяк ${maniac.username} покушается на ${player.username}</b>`,
      GameLog.types.MAF,
      true
    )

    // Если буду делать ситауцию,
    // когда игра ожидает ход маньяка,
    // то вызываю nigthIsOver
  }
}

module.exports = GameMulti
