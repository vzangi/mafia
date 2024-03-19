const BaseService = require('./BaseService')
const Chat = require('../../models/Chat')
const Punishment = require('../../models/Punishment')
const GamePlayer = require('../../models/GamePlayer')
const { getCoolDateTime } = require('../../units/helpers')
const typingUsers = []

class ChatService extends BaseService {
  // Список последних сообщений
  async lastMessages() {
    const messages = await Chat.scope('def').findAll()
    return messages
  }

  // Пришло сообщение
  async message(message) {
    const { user, io, socket } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const { account } = socket
    const { punishments } = account

    if (punishments && punishments.length > 0) {
      const muted = punishments.filter((p) => p.type == 1)
      if (muted.length > 0) return
    }

    // Ищу игрока в игре
    const playerInGame = await GamePlayer.findOne({
      where: {
        accountId: user.id,
        status: [
          GamePlayer.playerStatuses.FREEZED,
          GamePlayer.playerStatuses.IN_GAME,
        ],
      },
    })

    if (playerInGame) {
      this.getUserSockets(user.id, '/lobbi').forEach((s) => {
        s.emit('game.play', playerInGame.gameId)
      })
      return
    }

    try {
      // Сохраняю сообщение в базу
      const msg = await Chat.newMessage(user.id, message)

      // Рассылаю сообщение всем подключенным пользователям
      io.of('/lobbi').emit('chat.message', msg)
    } catch (error) {
      if (error.message == 'flood') {
        const punishmentData = {
          accountId: user.id,
          type: Punishment.types.MUTE,
        }

        // Смотрю количество предыдущих нказаний по этому типу
        const punishmentsCount = await Punishment.count({
          where: punishmentData,
        })

        punishmentData.untilAt = new Date(
          Date.now() + 1000 * 60 * 60 * (punishmentsCount + 1)
        ).toISOString()

        punishmentData.comment = 'По результатам автоблокировщика флуда'

        await Punishment.create(punishmentData)

        // Перегружаю открытые сокеты наказанного игрока
        const socks = this.getUserSockets(account.id, '/lobbi')
        socks.forEach((s) => s.emit('reload'))

        const date = getCoolDateTime(punishmentData.untilAt)

        const message = `Вам запрещено писать в чате лобби до ${date} по причине: флуд`

        const sysmsg = await Chat.sysMessage(
          `[${account.username}] запрещается писать в этот чат до ${date} за флуд.`
        )

        // Рассылаю сообщение всем подключенным пользователям
        io.of('/lobbi').emit('chat.message', sysmsg)

        // Уведомляю нарушителя
        await this.notify(account.id, message, 2)
      } else {
        throw new Error(error)
      }
    }
  }

  // Удаление сообщения из чата
  async removeMessage(id) {
    const { user, io, socket } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const { account } = socket

    if (account.role != 1) {
      throw new Error('Нет прав')
    }

    const message = await Chat.findByPk(id)

    if (!message) {
      throw new Error('Сообщение не найдено')
    }

    message.message = ''
    await message.save()

    io.of('/lobbi').emit('chat.message.removed', id)
  }

  // Пользователь начал что-то печатать в чате
  typingBegin() {
    const { io, socket } = this
    const { account } = socket
    if (!account) {
      throw new Error('Не авторизован')
    }
    const { username, punishments } = account

    if (punishments && punishments.length > 0) {
      const muted = punishments.filter((p) => p.type == 1)
      if (muted.length > 0) return
    }

    if (typingUsers[username]) {
      clearTimeout(typingUsers[username])
    }

    typingUsers[username] = setTimeout(() => {
      this._cancelTyping()
    }, 3000)

    io.of('/lobbi').emit('chat.typing.begin', Object.keys(typingUsers))
  }

  // Пользователь перестал печатать
  typingEnd() {
    const { socket } = this
    if (!socket.account) {
      throw new Error('Не авторизован')
    }
    const { username } = socket.account

    if (typingUsers[username]) {
      clearTimeout(typingUsers[username])
    }

    this._cancelTyping()
  }

  // Процедура завершения печати
  _cancelTyping() {
    const { io, socket } = this
    if (!socket.account) {
      throw new Error('Не авторизован')
    }
    const { username } = socket.account

    if (typingUsers[username]) {
      delete typingUsers[username]
    }
    io.of('/lobbi').emit('chat.typing.end', Object.keys(typingUsers))
  }
}

module.exports = ChatService
