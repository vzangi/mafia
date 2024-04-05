const { Op } = require('sequelize')
const Account = require('../models/Account')
const AccountThing = require('../models/AccountThing')
const Game = require('../models/Game')
const GamePlayer = require('../models/GamePlayer')
const GameStep = require('../models/GameStep')
const GameType = require('../models/GameType')
const GameLife = require('../models/GameLife')
const smiles = require('../units/smiles')
const {
  getDateFromIso,
  isoFromDate,
  isCorrectDateString,
} = require('../units/helpers')

class GameService {
  // Страница игры
  async game(gameId, user) {
    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    const game = await Game.findByPk(gameId)

    if (!game) {
      throw new Error('Игра не найдена')
    }

    if (game.status < 2) {
      throw new Error('В эту игру нельзя войти')
    }

    const data = {
      smiles,
      game,
    }

    data.isPlayer = false

    if (user) {
      const inGame = await GamePlayer.findOne({
        where: {
          gameId,
          accountId: user.id,
          status: [
            GamePlayer.playerStatuses.IN_GAME,
            GamePlayer.playerStatuses.FREEZED,
          ],
        },
      })

      if (inGame) {
        data.isPlayer = true
        data.isFreezed = inGame.status == GamePlayer.playerStatuses.FREEZED
      }
    }

    const seconds = Math.floor(
      (new Date(game.deadline) * 1) / 1000 - (Date.now() * 1) / 1000
    )
    data.seconds = seconds < 0 ? 0 : seconds

    data.players = await GamePlayer.scope({
      method: ['ingame', gameId],
    }).findAll()

    // Если идёт голосование, то достаю текущие голоса
    if (game.period == Game.periods.DAY) {
      data.steps = await GameStep.findAll({
        where: {
          gameId,
          day: game.day,
          stepType: GameStep.stepTypes.DAY,
        },
        include: [
          {
            model: Account,
            as: 'account',
            attributes: ['username'],
          },
          {
            model: Account,
            as: 'player',
            attributes: ['username'],
          },
        ],
      })
    }

    // Если ночь, достаю выстрелы
    if (game.period == Game.periods.NIGHT) {
      data.shoot = await GameStep.findOne({
        where: {
          gameId,
          accountId: user.id,
          day: game.day,
          stepType: GameStep.stepTypes.NIGHT,
        },
        include: [
          {
            model: Account,
            as: 'player',
            attributes: ['username'],
          },
        ],
      })
    }

    // Если перестрелка
    if (game.gametypeId == Game.types.SHOOTOUT) {
      const playerIds = data.players.map((pl) => pl.id)

      // Достаю текущие уровни жизней
      data.daylifes = await GameLife.findAll({
        where: {
          gameplayerId: playerIds,
          type: GameLife.types.DAY,
        },
      })

      data.power = {}
      for (const i in data.players) {
        data.power[data.players[i].accountId] = await AccountThing.getPower(
          data.players[i].accountId
        )
      }

      // Если игрок в партии
      if (user) {
        // и роль игрока - мафия
        const userInGame = data.players.filter((p) => p.accountId == user.id)

        if (userInGame.length == 1 && userInGame[0].roleId) {
          if (userInGame[0].roleId == Game.roles.MAFIA) {
            data.nightlifes = await GameLife.findAll({
              where: {
                gameplayerId: playerIds,
                type: GameLife.types.NIGHT,
              },
            })
          }

          if (userInGame[0].roleId == Game.roles.MANIAC) {
            data.manlifes = await GameLife.findAll({
              where: {
                gameplayerId: playerIds,
                type: GameLife.types.MANIAC,
              },
            })
          }
        }
      }
    }

    return data
  }

  async getLifes(gameId, user) {
    if (!gameId) {
      throw new Error('Нет необходимых данных')
    }

    const game = await Game.findByPk(gameId)
  }

  // Текущие игры
  async current() {
    const data = {}
    data.games = await Game.findAll({
      where: {
        status: Game.statuses.STARTED,
      },
      include: [
        { model: GameType },
        {
          model: GamePlayer,
          as: 'players',
          where: {
            status: [
              GamePlayer.playerStatuses.IN_GAME,
              GamePlayer.playerStatuses.KILLED,
              GamePlayer.playerStatuses.PRISONED,
              GamePlayer.playerStatuses.TIMEOUT,
              GamePlayer.playerStatuses.FREEZED,
              GamePlayer.playerStatuses.WON,
            ],
          },
          include: [
            {
              model: Account,
              attributes: ['username', 'avatar', 'online'],
            },
          ],
        },
      ],
    })

    data.title = 'Текущие игры Мафии идущие онлайн'
    data.description =
      'На этой странице вы найдёте список онлайн игр идущих в прямом эфире.'

    return data
  }

  // Получение интервала по датам
  _getDateInterval(from, to) {
    // Если обе даты верны
    if (isCorrectDateString(from) && isCorrectDateString(to)) {
      return {
        startedAt: {
          [Op.gte]: isoFromDate(from),
          [Op.lte]: isoFromDate(to, 1),
        },
      }
    }

    // Если пришла только дата "От"
    if (isCorrectDateString(from)) {
      return {
        startedAt: {
          [Op.gte]: isoFromDate(from),
        },
      }
    }

    // Если пришла только дата "До"
    if (isCorrectDateString(to)) {
      return {
        startedAt: {
          [Op.lte]: isoFromDate(to, 1),
        },
      }
    }

    // Если даты не пришли, то беру сегодняшний день
    const date = getDateFromIso(new Date().toISOString())
      .split('.')
      .reverse()
      .join('.')

    return {
      startedAt: {
        [Op.gte]: isoFromDate(date),
      },
    }
  }

  // Архив игр
  async archive(archiveData) {
    let { from, to } = archiveData
    const data = {
      from,
      to,
    }

    const { startedAt } = this._getDateInterval(from, to)

    data.games = await Game.findAll({
      where: {
        status: [Game.statuses.ENDED],
        startedAt,
      },
      order: [['startedAt', 'desc']],
      include: [
        { model: GameType },
        {
          model: GamePlayer,
          as: 'players',
          where: {
            status: [
              GamePlayer.playerStatuses.IN_GAME,
              GamePlayer.playerStatuses.KILLED,
              GamePlayer.playerStatuses.PRISONED,
              GamePlayer.playerStatuses.TIMEOUT,
              GamePlayer.playerStatuses.FREEZED,
              GamePlayer.playerStatuses.WON,
            ],
          },
          include: [
            {
              model: Account,
              attributes: ['username', 'avatar', 'online'],
            },
          ],
        },
      ],
    })

    data.title = 'Архив поединков онлайн игры Мафия'
    data.description =
      'На этой странице вы найдёте список прошедших игр онлайн проекта Mafia One.'

    return data
  }

  // Архив игр
  async myArchive(account, archiveData) {
    let { from, to, gameResult, userRoles } = archiveData

    if (!account) throw new Error('Нет необходимых данных')

    const data = {
      from,
      to,
      gameResult,
      userRoles,
    }

    const { startedAt } = this._getDateInterval(from, to)

    data.games = await GamePlayer.findAll({
      where: {
        accountId: account.id,
        status: [
          GamePlayer.playerStatuses.KILLED,
          GamePlayer.playerStatuses.PRISONED,
          GamePlayer.playerStatuses.TIMEOUT,
          GamePlayer.playerStatuses.WON,
        ],
      },
      order: [['createdAt', 'desc']],
      include: [
        {
          model: Game,
          where: {
            startedAt,
          },
          include: [
            {
              model: GameType,
            },
            {
              model: GamePlayer,
              as: 'players',
              where: {
                status: [
                  GamePlayer.playerStatuses.KILLED,
                  GamePlayer.playerStatuses.PRISONED,
                  GamePlayer.playerStatuses.TIMEOUT,
                  GamePlayer.playerStatuses.WON,
                ],
              },
            },
          ],
        },
      ],
    })

    data.title = 'Архив поединков онлайн игры Мафия'
    data.description =
      'На этой странице вы найдёте список прошедших игр онлайн проекта Mafia One.'

    return data
  }

  // Шаблон игры по типу
  getTemplateNameByType(type) {
    if (type == Game.types.CLASSIC) return 'game'
    if (type == Game.types.SHOOTOUT) return 'gamePerestrelka'
    return 'gameMulti'
  }
}

module.exports = new GameService()
