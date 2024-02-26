const Chat = require('../../models/Chat')
const Account = require('../../models/Account')
const Punishment = require('../../models/Punishment')
const BaseService = require('./BaseService')

class PunishmentService extends BaseService {
  // Удаление запрета
  async removePunish(id) {
    if (!id) {
      throw new Error('Нет необходимых данных')
    }

    const punish = await Punishment.findOne({
      where: { id },
      include: [
        {
          model: Account,
        },
      ],
    })

    if (!punish) {
      throw new Error('Запрет не найден')
    }

    const message = `Администратор отменил молчанку игрока [${punish.account.username}]`

    const sysmsg = await Chat.sysMessage(message)

    // Рассылаю сообщение всем подключенным пользователям
    this.io.of('/lobbi').emit('chat.message', sysmsg)

    await punish.destroy()
  }
}

module.exports = PunishmentService
