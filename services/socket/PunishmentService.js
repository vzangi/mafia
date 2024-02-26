const Punishment = require('../../models/Punishment')
const BaseService = require('./BaseService')

class PunishmentService extends BaseService {
  // Удаление запрета
  async removePunish(id) {
    if (!id) {
      throw new Error('Нет необходимых данных')
    }

    const punish = await Punishment.findByPk(id)

    if (!punish) {
      throw new Error('Запрет не найден')
    }

    await punish.destroy()
  }
}

module.exports = PunishmentService
