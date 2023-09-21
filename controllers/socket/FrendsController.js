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
      friendId,
      accountId: user.id,
      socket: Friend.statuses.ACCEPTED,
    })

    if (!isFrends) return

    // Создаем запрос предложения
    await Friend.create({
      accountId: user.id,
      friendId,
      status: Friend.statuses.MARRIED_REQUEST,
    })

    // Возвращаем на клиент результат
    callback()

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
    if (!user || !friendId) return

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

    // Возвращаю клиенту ответ
    callback()
  }
}

module.exports = (io, socket) => {
  return new FrendsController(io, socket)
}
