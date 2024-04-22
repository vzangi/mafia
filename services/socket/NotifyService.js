const Account = require('../../models/Account')
const Notification = require('../../models/Notification')
const BaseService = require('./BaseService')

class NotifyService extends BaseService {
  // Пометить нотификацию прочитанной
  async read(id) {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }
    if (!id) {
      throw new Error('Нет необходимых данных')
    }

    const notify = await Notification.findOne({
      where: {
        id,
        accountId: user.id,
      },
    })

    if (notify) {
      notify.isRead = true
      notify.save()
    }
  }

  // Получение списка непрочитанных нотификаций
  async getNewNotifies() {
    const { user } = this
    if (!user) {
      throw new Error('Не авторизован')
    }

    const notifies = await Notification.findAll({
      where: {
        accountId: user.id,
        isRead: false,
      },
    })

    return notifies
  }

  // Отправка нотификации пользователю
  async sendNotify(notifyData) {
    const { user } = this
    if (!user) throw new Error('Не авторизован')
    const account = await Account.findByPk(user.id)
    if (!account) throw new Error('Не авторизован')
    if (account.role != 1) throw new Error('Нет доступа')

    if (notifyData.message.length > 255) {
      notifyData.message = notifyData.message.substr(0, 255)
    }

    await Notification.create(notifyData)
  }
}

module.exports = NotifyService
