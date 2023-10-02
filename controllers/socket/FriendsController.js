const { Op } = require('sequelize')
const BaseSocketController = require('./BaseSocketController')
const Friend = require('../../models/Friend')
const Account = require('../../models/Account')
const WalletEvent = require('../../models/WalletEvents')

class FriendsController extends BaseSocketController {
  // Отправка оповещения о новом запросе на дружбу
  // Пользователю с id = friendId
  async _notifyFriendshipRequest(friendId) {
    const { socket } = this

    const count = await Friend.requestsCount(friendId)
    const ids = this.getUserSocketIds(friendId)

    ids.forEach((sid) => {
      socket.broadcast.to(sid).emit('friend.request', count)
    })
  }

  // Получение количества запросов в друзья
  async requestCount(callback) {
    const { user } = this
    if (!user) return

    const count = await Friend.requestsCount(user.id)
    callback(count)
  }

  // Добавление в друзья
  async add(friendId, callback) {
    const { user } = this.socket

    if (!user || !friendId || user.id == friendId) {
      return callback({ status: 1, msg: 'Не указанны необходимые данные' })
    }

    // Создаем запрос на дружбу (или просто нахоим его, если он уже был создан)
    const [_, created] = await Friend.findOrCreate({
      where: {
        accountId: user.id,
        friendId,
      },
    })

    // Возвращаем на клиент результат
    callback({ status: 0, msg: 'Запрос отправлен' })

    // Оповещение о новом запросе на дружбу
    this._notifyFriendshipRequest(friendId)
  }

  // Подтверждение добавления в друзья
  async accept(friendId, callback) {
    const { user } = this

    if (!user || !friendId)
      return callback({ status: 1, msg: 'Нет необходимых данных' })

    // Ищу запрос на добавление в друзья
    const request = await Friend.findOne({
      where: {
        accountId: friendId,
        friendId: user.id,
        status: Friend.statuses.REQUESTED,
      },
    })

    if (!request)
      return callback({ status: 2, msg: 'Запрос на дружбу не найден' })

    // Удаляю запросы на добавление в друзья
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
      },
    })
    await Friend.destroy({
      where: {
        accountId: friendId,
        friendId: user.id,
      },
    })

    // Создаю подтверждение
    await Friend.create({
      accountId: user.id,
      friendId,
      status: Friend.statuses.ACCEPTED,
    })
    await Friend.create({
      accountId: friendId,
      friendId: user.id,
      status: Friend.statuses.ACCEPTED,
    })

    // Возвращаю клиенту ответ
    callback({ status: 0, msg: 'Теперь вы друзья' })
  }

  // Отклонение добавления в друзья
  async decline(friendId, callback) {
    const { user } = this
    if (!user || !friendId) {
      return callback({ status: 1, msg: 'Не указанны необходимые данные' })
    }

    // Ищу запрос на добавление в друзья
    const request = await Friend.findOne({
      where: {
        accountId: friendId,
        friendId: user.id,
        status: Friend.statuses.REQUESTED,
      },
    })

    if (!request)
      return callback({ status: 2, msg: 'Запрос на дружбу не найден' })

    // Удаляю запросы на добавление в друзья
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
      },
    })
    await Friend.destroy({
      where: {
        accountId: friendId,
        friendId: user.id,
      },
    })

    // Создаю отмену
    await Friend.create({
      accountId: friendId,
      friendId: user.id,
      status: Friend.statuses.DECLINE,
    })

    // Возвращаю клиенту ответ
    callback({ status: 0, msg: 'Запрос отклонён' })
  }

  // Удаление из друзей
  async remove(friendId, callback) {
    const { user } = this
    if (!user || !friendId)
      return callback({ status: 1, msg: 'Нет необходимых данных' })

    // Ищу запись о дружбе
    const request = await Friend.findOne({
      where: {
        accountId: user.id,
        friendId,
        status: Friend.statuses.ACCEPTED,
      },
    })

    if (!request)
      return callback({ status: 2, msg: 'Записи о дружбе не найдены' })

    // Удаляю записи о дружбе игроков
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
      },
    })
    await Friend.destroy({
      where: {
        accountId: friendId,
        friendId: user.id,
      },
    })

    // Возвращаю клиенту ответ
    callback({ status: 0, msg: 'Запрос выполнен' })
  }

  // Блокировка (ЧС)
  async block(friendId, callback) {
    const { user } = this
    if (!user || !friendId)
      return callback({ status: 1, msg: 'Нет необходимых данных' })

    // Надо проверить, есть ли сделанные предложения или игроки женаты
    // Тогда вернуть ошибку, так как это платные услуги
    const relation = await Friend.findOne({
      where: {
        accountId: user.id,
        friendId,
        [Op.or]: [
          { status: Friend.statuses.MARRIED_REQUEST },
          { status: Friend.statuses.MARRIED },
        ],
      },
      order: [['id', 'DESC']],
    })

    if (relation) {
      return callback({
        status: 2,
        msg: 'Нельзя заблокировать игрока, которого позвали в ЗАГС',
      })
    }

    // Удаляю записи дружбы, если они были
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
      },
    })
    await Friend.destroy({
      where: {
        accountId: friendId,
        friendId: user.id,
      },
    })

    // Создаю запись ЧС
    await Friend.create({
      accountId: user.id,
      friendId,
      status: Friend.statuses.BLOCK,
    })

    callback({ status: 0, msg: 'Запрос выполнен' })
  }

  // Разблокировка от ЧС
  async unblock(friendId, callback) {
    const { user } = this
    if (!user || !friendId)
      return callback({ status: 1, msg: 'Нет необходимых данных' })

    // Удаляю запись блокировки
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
        status: Friend.statuses.BLOCK,
      },
    })

    callback({ status: 0, msg: 'Запрос выполнен' })
  }

  // Блокировка в ответ (ЧС)
  async blockToo(friendId, callback) {
    const { user } = this
    if (!user || !friendId)
      return callback({ status: 1, msg: 'Нет необходимых данных' })

    const block = await Friend.destroy({
      where: {
        accountId: friendId,
        friendId: user.id,
        status: Friend.statuses.BLOCK,
      },
    })

    if (!block)
      return callback({ status: 2, msg: 'Вы не заблокированы у этого игрока' })

    // Удаляю записи дружбы, если они были
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
      },
    })
    await Friend.destroy({
      where: {
        accountId: friendId,
        friendId: user.id,
      },
    })

    // Создаю запись ЧС
    await Friend.create({
      accountId: user.id,
      friendId,
      status: Friend.statuses.BLOCK,
    })

    // Создаю запись ЧС
    await Friend.create({
      accountId: friendId,
      friendId: user.id,
      status: Friend.statuses.BLOCK,
    })

    callback({ status: 0, msg: 'Запрос выполнен' })
  }

  // Позвать в ЗАГС
  async zags(friendId, callback) {
    const { user } = this
    if (!user || !friendId || user.id == friendId)
      return callback({
        status: 1,
        msg: 'Отсутсвуют необходимые данные. Запрос не выполнен.',
      })

    const account = await Account.findByPk(user.id)
    if (!account)
      return callback({
        status: 2,
        msg: 'Пользователь не найден. Запрос не выполнен.',
      })

    if (account.wallet < WalletEvent.marriageCost)
      return callback({
        status: 3,
        msg: `В кошельке не хватает средств. Чтобы сделать предложение, там должно быть как минимум ${WalletEvent.marriageCost} рублей.`,
      })

    // Ищем игрока в друзьях (предложение можно сделать только другу)
    const isFrends = await Friend.findOne({
      where: {
        friendId,
        accountId: user.id,
        status: Friend.statuses.ACCEPTED,
      },
    })

    if (!isFrends) {
      return callback({
        status: 3,
        msg: 'Предложение можно сделать только одному из друзей',
      })
    }

    const haveZagsRequests = await Friend.findOne({
      where: {
        accountId: user.id,
        [Op.or]: [
          { status: Friend.statuses.MARRIED },
          { status: Friend.statuses.MARRIED_REQUEST },
        ],
      },
    })

    if (haveZagsRequests) {
      return callback({
        status: 4,
        msg:
          haveZagsRequests.status == Friend.statuses.MARRIED
            ? 'Вы уже сходили в ЗАГС'
            : 'Вы уже сделали предложение, нельзя делать второе пока оно не отклонено',
      })
    }

    const friendMarried = await Friend.findOne({
      where: {
        friendId,
        [Op.or]: [
          { status: Friend.statuses.MARRIED },
          { status: Friend.statuses.MARRIED_REQUEST },
        ],
      },
    })

    if (friendMarried) {
      return callback({
        status: 3,
        msg:
          friendMarried.status == Friend.statuses.MARRIED
            ? 'Этот игрок уже сходил в ЗАГС'
            : 'Этому игроку уже сделали предложение',
      })
    }

    // Списываем с кошелька стомость свадьбы
    try {
      await WalletEvent.marriage(user.id)
    } catch (error) {
      console.log(error)
      return callback({
        status: 4,
        msg: 'Не удалось списать средства с кошелька',
      })
    }

    // Создаем запрос предложения
    await Friend.create({
      accountId: user.id,
      friendId,
      status: Friend.statuses.MARRIED_REQUEST,
    })

    // Возвращаем на клиент результат
    callback({
      status: 0,
      msg: 'Предложение сделано',
    })

    // Пробуем оповестить о новом предложении
    this._notifyFriendshipRequest(friendId)
  }

  // Согласие на ЗАГС
  async zagsAccept(friendId, callback) {
    const { user } = this
    if (!user || !friendId)
      return callback({ status: 1, msg: 'Нет необходимых данных' })

    // Ищу предложение
    const request = await Friend.findOne({
      where: {
        accountId: friendId,
        friendId: user.id,
        status: Friend.statuses.MARRIED_REQUEST,
      },
    })

    if (!request) return callback({ status: 2, msg: 'Предложение не найдено' })

    // Удаляю запросы на добавление в друзья
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
      },
    })
    await Friend.destroy({
      where: {
        accountId: friendId,
        friendId: user.id,
      },
    })

    // Создаю подтверждение
    await Friend.create({
      accountId: user.id,
      friendId,
      status: Friend.statuses.MARRIED,
    })
    await Friend.create({
      accountId: friendId,
      friendId: user.id,
      status: Friend.statuses.MARRIED,
    })

    // Возвращаю клиенту ответ
    callback({ status: 0, msg: 'Запрос выполнен' })
  }

  // Отказ от ЗАГСА
  async zagsDecline(friendId, callback) {
    const { user } = this
    if (!user || !friendId)
      return callback({ status: 1, msg: 'Нет необходимых данных' })

    // Удаляю запросы на добавление в друзья
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
        status: Friend.statuses.MARRIED_REQUEST,
      },
    })
    await Friend.destroy({
      where: {
        accountId: friendId,
        friendId: user.id,
        status: Friend.statuses.MARRIED_REQUEST,
      },
    })

    // Возвращаю на кошелёк половину средств потраченных на предложение
    try {
      await WalletEvent.denial(friendId)
    } catch (error) {
      console.log(error)
      return callback({
        status: 2,
        msg: 'Не удалось вернуть средства на кошелёк',
      })
    }

    // Возвращаю клиенту ответ
    callback({ status: 0, msg: 'Запрос выполнен' })
  }

  // Отозвать предложение
  async recall(friendId, callback) {
    const { user } = this
    if (!user || !friendId)
      return callback({ status: 1, msg: 'Нет необходимых данных' })

    // Находим предложение
    const request = await Friend.findOne({
      where: {
        accountId: user.id,
        friendId,
        status: Friend.statuses.MARRIED_REQUEST,
      },
    })

    if (!request) {
      return callback({ status: 1, msg: 'Предложение не найдено' })
    }

    // Возвращаю на кошелёк половину средств потраченных на предложение
    try {
      await WalletEvent.recall(user.id)
    } catch (error) {
      console.log(error)
      return callback({
        status: 2,
        msg: 'Не удалось вернуть средства на кошелёк',
      })
    }

    // Удаляю предложение
    await request.destroy()

    // Возвращаю клиенту ответ
    callback({ status: 0, msg: 'Предложение отозвано' })
  }

  // Развод
  async divorce(friendId, callback) {
    const { user } = this
    if (!user || !friendId) {
      return callback({ status: 1, msg: 'Нет необходимых данных' })
    }

    const isMarried = await Friend.findOne({
      where: {
        accountId: user.id,
        friendId,
        status: Friend.statuses.MARRIED,
      },
    })

    if (!isMarried) {
      return callback({
        status: 2,
        msg: 'Вы не можете развестись с тем, с кем не состоите в отношениях',
      })
    }

    const account = await Account.findByPk(user.id)
    if (!account)
      return callback({
        status: 2,
        msg: 'Пользователь не найден. Запрос не выполнен.',
      })

    if (account.wallet < WalletEvent.divorceCost)
      return callback({
        status: 3,
        msg: `В кошельке не хватает средств. Чтобы развестись, там должно быть как минимум ${WalletEvent.divorceCost} рублей.`,
      })

    // Списываем с кошелька стомость развода
    try {
      await WalletEvent.divorce(user.id)
    } catch (error) {
      console.log(error)
      return callback({
        status: 4,
        msg: 'Не удалось списать средства с кошелька',
      })
    }

    // Удаляю записи о свадьбе
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
      },
    })
    await Friend.destroy({
      where: {
        accountId: friendId,
        friendId: user.id,
      },
    })

    // Возвращаю дружбу
    await Friend.create({
      accountId: user.id,
      friendId,
      status: Friend.statuses.ACCEPTED,
    })
    await Friend.create({
      accountId: friendId,
      friendId: user.id,
      status: Friend.statuses.ACCEPTED,
    })

    // Возвращаю клиенту ответ
    callback({
      status: 0,
      msg: 'Вы развелись',
    })
  }
}

module.exports = (io, socket) => {
  return new FriendsController(io, socket)
}
