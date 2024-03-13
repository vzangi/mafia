const { DataTypes, Sequelize } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')
const Game = require('./Game')

// Типы событий
const eventTypes = {
  // Результат игры
  RESULT: 1,

  // Игровое действие
  ACTION: 2,

  // Игровое событие/факт
  FACT: 3,

  // Баллы за сорев
  COMPETITION: 4,

  // Баллы топа недели
  TOPWEEK: 5,
}

// Результаты
const resultEvents = {
  // Победа
  WIN: 1,

  // Поражение
  LOOSE: 2,

  // Ничья
  DRAW: 3,

  // Тайм
  TIMEOUT: 4,
}

// Действия
const actionEvents = {
  // Маф убил игрока
  MAF_KILL: 1,

  // Маф промазал
  MAF_MISS: 2,

  // Маньяк убил игрока
  MAN_KILL: 3,

  // Ком нашёл мафа
  KOM_FIND_MAF: 4,

  // Доктор спас от смерти
  DOC_SAVE: 5,

  // Адвокат защитил от посадки
  ADV_SAVE: 6,

  // Любовница заморозила игрока
  LOVER_FREEZ: 7,
}

// Факты
const factEvents = {
  // Первая посадка
  FIRST_ZEK: 1,

  // Первый труп
  FIRST_CORSE: 2,

  // Первая проверка
  FIRST_CHECK: 3,
}

const GameEvent = sequelize.define(
  'gameevents',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    gameId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.INTEGER,
    },
    value: {
      type: DataTypes.INTEGER,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    scopes: {
      top: {
        where: {
          type: eventTypes.TOPWEEK,
        },
        include: [
          {
            model: Account,
            attributes: ['username', 'avatar'],
          },
        ],
        attributes: [
          'accountId',
          [Sequelize.fn('SUM', Sequelize.col('value')), 'total'],
          'account.username',
          'account.avatar',
        ],
        group: ['accountId'],
        order: [['total', 'desc']],
        raw: true,
      },
    },
  }
)

GameEvent.belongsTo(Account)
GameEvent.belongsTo(Game)

GameEvent.eventTypes = eventTypes
GameEvent.resultEvents = resultEvents
GameEvent.actionEvents = actionEvents
GameEvent.factEvents = factEvents

GameEvent.positionInTop = async (accountId) => {
  const list = await GameEvent.scope('top').findAll()
  for (const index in list) {
    if (list[index].accountId == accountId) return [index * 1 + 1, list[index]]
  }
  return [null, null]
}

module.exports = GameEvent
