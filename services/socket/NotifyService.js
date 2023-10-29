const Notification = require("../../models/Notification");
const BaseService = require("./BaseService");

class NotifyService extends BaseService {
    // Пометить нотификацию прочитанной
    async read(id) {
        const { user } = this
        if (!user) {
            throw new Error("Не авторизован")
        }
        if (!id) {
            throw new Error("Нет необходимых данных")
        }

        const notify = await Notification.findOne({
            where: {
                id,
                accountId: user.id
            }
        })

        if (notify) {            
            notify.isRead = 1
            notify.save()
        }
    }

    // Получение списка непрочитанных нотификаций
    async getNewNotifies() {
        const { user } = this
        if (!user) {
            throw new Error("Не авторизован")
        }

        const notifies = await Notification.findAll({
            where: {
                accountId: user.id,
                isRead: 0
            }
        })

        return notifies
    }
}

module.exports = NotifyService