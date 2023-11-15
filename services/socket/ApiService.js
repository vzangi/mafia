const { Op } = require('sequelize')
const smiles = require('../../units/smiles')
const Account = require('../../models/Account')
const AccountName = require('../../models/AccountName')
const AccountThing = require('../../models/AccountThing')
const Friend = require('../../models/Friend')
const Thing = require('../../models/Thing')
const Trade = require('../../models/Trade')
const WalletEvents = require('../../models/WalletEvents')
const BaseService = require('./BaseService')
const sequelize = require('../../units/db')

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
      },
    })

    return friends
  }

  // Активация VIP пропуска
  async vipActivate(id) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!id) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await AccountThing.findByPk(id, {
      include: [{ model: Thing }, { model: Account }],
    })

    if (!thing) {
      throw new Error('Вещь не найдена')
    }

    if (thing.accountId != user.id) {
      throw new Error('На чужое позарился!?')
    }

    if (thing.thing.thingtypeId != 2) {
      throw new Error('Активировать можно только пропуска')
    }

    if (thing.account.vip) {
      throw new Error('У тебя уже активирован VIP статус')
    }

    const dt = new Date()

    if (thing.thing.thingclassId == 2) {
      // VIP на неделю
      dt.setDate(dt.getDate() + 7)
    }
    if (thing.thing.thingclassId == 3) {
      // VIP на месяц
      dt.setDate(dt.getDate() + 31)
    }

    // Удаляю пропуск из инвентаря
    AccountThing.destroy({ where: { id } })

    // Активирую VIP статус аккаунта
    Account.update(
      {
        vipTo: dt.toISOString(),
      },
      {
        where: {
          id: user.id,
        },
      }
    )
  }

  // Получение количества предложений обмена
  async tradesCount() {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const count = await Trade.count({
      where: {
        toId: user.id,
        status: 0,
      },
    })

    return count
  }
}

module.exports = ApiService
