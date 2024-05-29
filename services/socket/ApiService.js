const fs = require('fs')
const { Op } = require('sequelize')
const smiles = require('../../units/smiles')
const Account = require('../../models/Account')
const AccountName = require('../../models/AccountName')
const GamePlayer = require('../../models/GamePlayer')
const Friend = require('../../models/Friend')
const Notification = require('../../models/Notification')
const WalletEvents = require('../../models/WalletEvents')
const BaseService = require('./BaseService')
const Punishment = require('../../models/Punishment')
const AccountSetting = require('../../models/AccountSetting')
const {
  isCorrectDateString,
  isoFromDate,
  getDateFromIso,
} = require('../../units/helpers')
const Game = require('../../models/Game')
const GameType = require('../../models/GameType')
const GameEvent = require('../../models/GameEvent')
const { online } = require('../../units/AccountHelper')
const sequelize = require('../../units/db')
const htmlspecialchars = require('htmlspecialchars')
const Promo = require('../../models/Promo')
const AccountPromo = require('../../models/AccountPromo')
const archiveLimit = 20

class ApiService extends BaseService {
  // Промокод
  async takePromo(code) {
    const { user } = this
    if (!user) throw new Error('Не авторизован')

    const promo = await Promo.findOne({ where: { code } })
    if (!promo) throw new Error('Акция по этому промокоду не найдена')

    const hasTaked = await AccountPromo.findOne({
      where: {
        accountId: user.id,
        promoId: promo.id,
      },
    })
    if (hasTaked) throw new Error('Вы уже воспользовались акцией по этому коду')

    const { message } = await Promo.runPromo(promo, user.id)

    return message
  }

  // Изменение описания пользователя
  async userAboutChange(aboutText) {
    const { user } = this
    if (!user) throw new Error('Не авторизован')
    if (!aboutText || aboutText.trim() == '') throw new Error('Пустое описание')

    aboutText = htmlspecialchars(aboutText)
    if (aboutText.length > 255) aboutText = aboutText.substr(0, 255)

    const about = await AccountSetting.setAboutSetting(user.id, aboutText)
    return about
  }

  // Список пользователей по части ника
  async usersByNik(nik) {
    const users = await Account.findAccountsByNik(nik)
    return users
  }

  // Игроки онлайн
  async onlineUsers() {
    const users = await online()
    return users
  }

  // Список доступных смайлов
  async smiles() {
    return smiles
  }

  // Получение количества запросов в друзья
  async requestCount() {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const count = await Friend.requestsCount(user.id)
    return count
  }

  // Именения поля "Пол" игрока
  async changeGender(gender) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const inGame = await this._inGame(user)

    if (inGame) {
      throw new Error('Нельзя менять это поле во время игры')
    }

    if (gender != 0 && gender != 1 && gender != 2) {
      throw new Error('Неверное значение поля gender')
    }

    await Account.update(
      {
        gender,
      },
      {
        where: {
          id: user.id,
        },
      }
    )
  }

  // Смена ника
  async changeNik(newnik) {
    const { user, socket } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const inGame = await this._inGame(user)

    if (inGame) {
      throw new Error('Нельзя менять ник пока вы находитесь в заявке или игре')
    }

    const nik = newnik.trim()
    if (nik.length < 4) {
      throw new Error('Ник не может быть короче 4 символов')
    }

    if (nik.length > 30) {
      throw new Error('Ник не может быть длиннее 30 символов')
    }

    const nikPattern = /^[\-_а-яА-ЯёЁ0-9a-zA-Z\s]+$/g
    if (!nik.match(nikPattern)) {
      throw new Error(
        'Ник может состоять только из букв, цифр, дефисов и знаков нижнего подчеркивания'
      )
    }

    const hasNik = await Account.count({
      where: {
        username: nik,
      },
    })

    if (hasNik != 0) {
      throw new Error('Ник занят')
    }

    const nikInHistory = await AccountName.findOne({
      where: {
        username: nik,
      },
    })

    if (nikInHistory) {
      if (nikInHistory.accountId != user.id) {
        throw new Error('Нельзя использовать бывший ник другого игрока')
      }
    }

    const account = await Account.findOne({
      where: {
        id: user.id,
      },
    })

    const namesChangesCount = await AccountName.count({
      where: {
        accountId: user.id,
      },
    })

    // Сумма необходимая для смены ника
    const price = namesChangesCount * 100

    if (account.wallet < price) {
      throw new Error(
        `Для смены ника на счету должно быть как минимум ${price} рублей`
      )
    }

    // Списываю средства за смену ника
    if (price != 0) {
      await WalletEvents.nikChange(user.id, price)
    }

    // Сохраняю в историю предыдущий ник
    await AccountName.create({
      accountId: account.id,
      username: account.username,
    })

    // Меняю ник
    account.username = nik
    account.save()

    // Отправляю на все вкладки оповещение о необходимости обновить страницу
    const ids = this.getUserSocketIds(user.id)
    ids.forEach((sid) => {
      socket.broadcast.to(sid).emit('nik.changed', nik)
    })
  }

  // Получения списка друзей со статусом "онлайн"
  async getOnlineFriends() {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const friends = await Friend.findAll({
      where: {
        accountId: user.id,
        [Op.or]: [
          { status: Friend.statuses.ACCEPTED },
          { status: Friend.statuses.MARRIED },
        ],
      },
      include: {
        model: Account,
        as: 'friend',
        where: {
          online: true,
        },
        attributes: ['id', 'avatar', 'username'],
        include: [
          {
            model: Punishment,
            where: {
              untilAt: {
                [Op.gt]: new Date().toISOString(),
              },
            },
            attributes: ['type', 'untilAt', 'coolDate'],
            required: false,
          },
          {
            model: GamePlayer,
            attributes: ['gameId'],
            where: {
              status: [
                GamePlayer.playerStatuses.IN_GAME,
                GamePlayer.playerStatuses.FREEZED,
              ],
            },
            required: false,
          },
        ],
      },
    })

    return friends
  }

  // Проверяю находится ли игрок в партии или заявке
  async _inGame(user) {
    if (!user) {
      throw new Error('Не авторизован')
    }

    const inGame = await GamePlayer.findOne({
      where: {
        accountId: user.id,
        status: [
          GamePlayer.playerStatuses.IN_GAME,
          GamePlayer.playerStatuses.FREEZED,
          GamePlayer.playerStatuses.WHAITNG,
        ],
      },
    })

    if (inGame) return true

    return false
  }

  // Получение нотификаций
  async getNotifies(lastId) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const notifies = await Notification.findAll({
      where: {
        accountId: user.id,
        id: {
          [Op.lt]: lastId,
        },
      },
      limit: 10,
      order: [['id', 'DESC']],
    })

    return notifies
  }

  // Скрытие или отображение инвентаря
  async inventorySetting(value) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (value != 0 && value != 1 && value != 2) {
      throw new Error('Неверные данные')
    }

    await AccountSetting.setHideInventSetting(user.id, value)

    return true
  }

  // Настройка уведомления о начале игры в телегу
  async gamenotifySetting(value) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (value != 1 && value != 2) {
      throw new Error('Неверные данные')
    }

    await AccountSetting.setGameStartNotifySetting(user.id, value)

    return true
  }

  // Настройка уведомления о начале игры в телегу
  async gamePlaySoundSetting(value) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (value != 1 && value != 0) {
      throw new Error('Неверные данные')
    }

    await AccountSetting.setGameStartSoundSetting(user.id, value)

    return true
  }

  // Настройка количества колонок в игре
  async gameColCountSetting(value) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (value != 1 && value != 2) {
      throw new Error('Неверные данные')
    }

    await AccountSetting.setGameColCountSetting(user.id, value)

    return true
  }

  // Установка индексируемости профиля
  async indexable(data) {
    const { id, noindex } = data
    if (!id || noindex === undefined) throw new Error('Нет необходимых данных')
    await Account.update({ noindex }, { where: { id } })
  }

  // Именения скина
  async changeSkin(skin) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    skin = skin * 1

    if (skin < 0 || skin > 4) {
      throw new Error('Неверный скин')
    }

    await Account.update(
      {
        skin,
      },
      {
        where: {
          id: user.id,
        },
      }
    )
  }

  // Удалить фон
  async removeBG() {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const account = await Account.findByPk(user.id)

    if (!account) {
      throw new Error('Пользователь не найден')
    }

    if (account.bg) {
      // Удаляю фото, чтобы не захламлять сервер
      fs.unlink(`${__dirname}/../../public/uploads/${account.bg}`, (err) => {
        if (err) log(err)
      })

      account.bg = null
      await account.save()
    }
  }

  // Архив всех игр
  async archive(data) {
    let { from, to, idless } = data
    const result = { from, to }

    const { startedAt } = this._getDateInterval(from, to)

    const where = {
      status: [Game.statuses.ENDED],
      startedAt,
    }

    const cnt = await Game.findAll({
      where,
      group: ['gametypeId'],
      attributes: [[sequelize.fn('count', 'id'), 'cnt'], 'gametypeId'],
    })

    result.cnt = {
      total: 0,
      classic: 0,
      shootout: 0,
      multi: 0,
      constructor: 0,
    }

    cnt.forEach((c) => {
      const count = c.get('cnt') * 1
      result.cnt.total += count
      if (c.gametypeId == Game.types.CLASSIC) result.cnt.classic += count
      if (c.gametypeId == Game.types.SHOOTOUT) result.cnt.shootout += count
      if (c.gametypeId == Game.types.MULTI) result.cnt.multi += count
      if (c.gametypeId == Game.types.CONSTRUCTOR)
        result.cnt.constructor += count
    })

    if (idless) {
      where.id = {
        [Op.lte]: idless,
      }
    }

    result.games = await Game.findAll({
      where,
      order: [['startedAt', 'desc']],
      limit: archiveLimit + 1,
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

    result.limit = archiveLimit

    return result
  }

  // Архив игр игрока
  async userArchive(data) {
    if (data.fact) {
      return await this._byFacts(data)
    }

    if (data.action) {
      return await this._byActions(data)
    }

    if (data.userRoles) {
      return await this._byRoles(data)
    }

    if (data.gameResult) {
      return await this._byResult(data)
    }

    return await this._byResult(data)
  }

  // Архив по результатам
  async _byResult(data) {
    const { from, to, gameResult, idless } = data
    const { user } = this

    if (!user) throw new Error('Не авторизован')

    const result = { from, to }

    const { startedAt } = this._getDateInterval(from, to)

    const where = {
      accountId: user.id,
      type: GameEvent.eventTypes.RESULT,
      active: true,
    }

    if (gameResult) {
      if (isNaN(gameResult)) throw new Error('Неверный аргумент')
      where.value = gameResult * 1
    }

    if (idless) {
      where.id = {
        [Op.lte]: idless,
      }
    }

    result.games = await GameEvent.findAll({
      where,
      limit: archiveLimit + 1,
      order: [['id', 'desc']],
      include: [
        {
          model: Game,
          where: { startedAt },
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

    result.limit = archiveLimit

    return result
  }

  // Архив по ролям
  async _byRoles(data) {
    const { from, to, gameResult, userRoles, idless } = data
    const { user } = this

    if (!user) throw new Error('Не авторизован')

    const result = { from, to }

    const { startedAt } = this._getDateInterval(from, to)

    const eventsWhere = {
      where: {
        accountId: user.id,
        type: GameEvent.eventTypes.RESULT,
        createdAt: startedAt,
      },
      attributes: ['id', 'gameId'],
      limit: archiveLimit + 1,
      order: [['id', 'desc']],
      raw: true,
      include: [
        {
          model: Game,
          required: true,
          include: [
            {
              model: GamePlayer,
              as: 'players',
              where: {
                accountId: user.id,
                roleId: JSON.parse(userRoles),
              },
              required: true,
            },
          ],
        },
      ],
    }

    if (gameResult) {
      if (isNaN(gameResult)) throw new Error('Неверный аргумент')
      eventsWhere.where.value = gameResult * 1
    }

    if (idless) {
      eventsWhere.where.id = {
        [Op.lte]: idless,
      }
    }

    const events = await GameEvent.findAll(eventsWhere)

    const ids = events.map((e) => e.id)

    const where = {
      where: { id: ids },
      limit: archiveLimit + 1,
      order: [['id', 'desc']],
      include: [
        {
          model: Game,
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
    }

    result.games = await GameEvent.findAll(where)

    result.limit = archiveLimit

    return result
  }

  // Архив по действиям
  async _byActions(data) {
    const { from, to, action, idless } = data
    const { user } = this

    if (!user) throw new Error('Не авторизован')

    const result = { from, to }

    const { startedAt } = this._getDateInterval(from, to)

    const where = {
      accountId: user.id,
      type: GameEvent.eventTypes.ACTION,
      value: action,
      active: true,
    }

    if (idless) {
      where.id = {
        [Op.lte]: idless,
      }
    }

    result.games = await GameEvent.findAll({
      where,
      limit: archiveLimit + 1,
      order: [['id', 'desc']],
      include: [
        {
          model: Game,
          where: { startedAt },
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

    result.limit = archiveLimit

    return result
  }

  // Архив по игровым фактам
  async _byFacts(data) {
    const { from, to, fact, idless } = data
    const { user } = this

    if (!user) throw new Error('Не авторизован')

    const result = { from, to }

    const { startedAt } = this._getDateInterval(from, to)

    const where = {
      accountId: user.id,
      type: GameEvent.eventTypes.FACT,
      value: fact,
      active: true,
    }

    if (idless) {
      where.id = {
        [Op.lte]: idless,
      }
    }

    result.games = await GameEvent.findAll({
      where,
      limit: archiveLimit + 1,
      order: [['id', 'desc']],
      include: [
        {
          model: Game,
          where: { startedAt },
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

    result.limit = archiveLimit

    return result
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
}

module.exports = ApiService
