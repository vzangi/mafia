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
const { isCorrectDateString, isoFromDate } = require('../../units/helpers')
const Game = require('../../models/Game')
const GameType = require('../../models/GameType')
const GameEvent = require('../../models/GameEvent')

class ApiService extends BaseService {
  // Список пользователей по части ника
  async usersByNik(nik) {
    const users = await Account.findAccountsByNik(nik)
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

  // Архив игр игрока
  async userArchive(data) {
    if (data.gameResult) {
      return await this._byResult(data)
    }
  }

  // Архив по результатам
  async _byResult(data) {
    let { from, to, gameResult } = data
    const { account } = this

    if (!account) throw new Error('Не авторизован')

    const result = { from, to }

    const { startedAt } = this._getDateInterval(from, to)

    const where = {
      accountId: account.id,
      type: GameEvent.actionEvents.RESULT,
      value: gameResult,
      active: true,
    }

    result.games = await GameEvent.findAll({
      where,
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
