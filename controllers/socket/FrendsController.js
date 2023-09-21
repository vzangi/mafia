const { Op } = require('sequelize')
const Friend = require('../../models/Friend')
const BaseSocketController = require('./BaseSocketController')

class FrendsController extends BaseSocketController {
  // Отправка оповещения о новом запросе на дружбу
  // Пользователю с id = friendId
  async _notifyFriendshipRequest(friendId) {
    const { socket } = this
    try {
      // Смотрим сколько запросов на дружбу
      const count = await Friend.requestsCount(friendId)

      // Проходимся по всем сокетам
      for (const [sid, s] of socket.server.of('/').sockets) {
        // Если в сокете нет пользователя (он гость), то пропускаем его
        if (!s.user) continue
        console.log(s.user.id, friendId)
        // Если в каком-то из сокетов найден нужный игрок
        if (s.user.id == friendId) {
          // Отправляем ему оповещение
          socket.broadcast.to(sid).emit('friend.request', count)
        }
      }
    } catch (e) {
      console.log(e)
    }
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

    if (!user || !friendId || user.id == friendId) return

    // Создаем запрос на дружбу (или просто нахоим его, если он уже был создан)
    const [_, created] = await Friend.findOrCreate({
      where: {
        accountId: user.id,
        friendId,
      },
    })

    // Возвращаем на клиент результат
    callback(created)

    // Оповещение о новом запросе на дружбу
    this._notifyFriendshipRequest(friendId)
  }

  // Подтверждение добавления в друзья
  async accept(friendId, callback) {
    const { user } = this

    if (!user || !friendId) return

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
    callback()
  }

  // Отклонение добавления в друзья
  async decline(friendId, callback) {
    const { user } = this
    if (!user || !friendId) return

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
    callback()
  }

  // Удаление из друзей
  async remove(friendId, callback) {
    const { user } = this
    if (!user || !friendId) return

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

    // Возвращаю клиенту ответ
    callback()
  }

  // Блокировка (ЧС)
  async block(friendId, callback) {
    const { user } = this
    if (!user || !friendId) return

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

    callback()
  }

  // Разблокировка от ЧС
  async unblock(friendId, callback) {
    const { user } = this
    if (!user || !friendId) return

    // Удаляю запись блокировки
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
      },
    })

    callback()
  }

  // Блокировка в ответ (ЧС)
  async blockToo(friendId, callback) {
    const { user } = this
    if (!user || !id) return

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

    callback()
  }

  // Позвать в ЗАГС
  async zags(friendId, callback) {
    const { user } = this
    if (!user || !friendId || user.id == friendId) return

    // Ищем игрока в друзьях (предложение можно сделать только другу)
    const isFrends = await Friend.findOne({
      where: {
        friendId,
        accountId: user.id,
        status: Friend.statuses.ACCEPTED,
      }
    })

    if (!isFrends) {
      return callback({
        status: 1,
        msg: 'Предложение можно сделать только одному из друзей'
      })
    }

    const haveZagsRequests = await Friend.findOne({
      where: {
        accountId: user.id,
        [Op.or]: [
          { status: Friend.statuses.MARRIED },
          { status: Friend.statuses.MARRIED_REQUEST },
        ]
      }
    })

    if (haveZagsRequests) {
      return callback({
        status: 2,
        msg: haveZagsRequests.status == Friend.statuses.MARRIED
          ? 'Вы уже сходили в ЗАГС'
          : 'Вы уже сделали предложение, нельзя делать второе пока оно не отклонено'
      })
    }

    const friendMarried = await Friend.findOne({
      where: {
        friendId,
        [Op.or]: [
          { status: Friend.statuses.MARRIED },
          { status: Friend.statuses.MARRIED_REQUEST },
        ]
      }
    })

    if (friendMarried) {
      return callback({
        status: 3,
        msg: friendMarried.status == Friend.statuses.MARRIED
          ? 'Этот игрок уже сходил в ЗАГС'
          : 'Этому игроку уже сделали предложение'
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
      msg: 'Предложение сделано'
    })

    // Пробуем оповестить о новом предложении
    this._notifyFriendshipRequest(friendId)
  }

  // Согласие на ЗАГС
  async zagsAccept(friendId, callback) {
    const { user } = this
    if (!user || !friendId) return

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
    callback()
  }

  // Отказ от ЗАГСА
  async zagsDecline(friendId, callback) {
    const { user } = this
    if (!user || !friendId) return

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

    // Возвращаю клиенту ответ
    callback()
  }

  // Отозвать предложение
  async recall(friendId, callback) {
    const { user } = this
    if (!user || !friendId) return

    // Удаляю предложение
    await Friend.destroy({
      where: {
        accountId: user.id,
        friendId,
        status: Friend.statuses.MARRIED_REQUEST,
      },
    })

    // Возвращаю клиенту ответ
    callback()
  }

  // Развод
  async divorce(friendId, callback) {
    const { user } = this
    if (!user || !friendId) {
      return callback({
        status: 1,
        msg: 'Нет необходимых данных'
      })
    } 

    const isMarried = await Friend.findOne({
      where: {
        accountId: user.id,
        friendId,
        status: Friend.statuses.MARRIED
      }
    })

    if (!isMarried) {
      return callback({
        status: 2,
        msg: 'Вы не можете развестись с тем, с кем не состоите в отношениях'
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
      status: Friend.statuses.ACCEPTED
    })
    await Friend.create({
      accountId: friendId,
      friendId: user.id,
      status: Friend.statuses.ACCEPTED
    })

    // Возвращаю клиенту ответ
    callback({
      status: 0,
      msg: 'Вы развелись'
    })
  }
}

module.exports = (io, socket) => {
  return new FrendsController(io, socket)
}
