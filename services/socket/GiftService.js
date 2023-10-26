const GiftGroups = require('../../models/GiftGroup')
const AccountGift = require('../../models/AccountGift')
const Account = require('../../models/Account')
const Gift = require('../../models/Gift')
const WalletEvent = require('../../models/WalletEvents')
const { Op } = require('sequelize')
const sequelize = require('../../units/db')
const BaseService = require('./BaseService')

class GiftService extends BaseService {
    // Получение следующей партии открыток пользователя
    async getNext(accountId, lastId) {
        const gifts = await AccountGift.scope({
            method: ['withModels', accountId, lastId],
        }).findAll()
        return gifts
    }

    // Возвращает группы открыток
    async giftGroups() {
        const groups = await GiftGroups.findAll({
            where: {
                active: 1,
            },
            attributes: ['id', 'name'],
            order: [['sort', 'ASC']],
        })
        return groups
    }

    // Получение открыток определенной группы
    async giftItems(giftgroupId, lastId) {
        const gifts = await Gift.scope({
            method: ['items', giftgroupId, lastId],
        }).findAll()
        return gifts
    }

    // Покупка открытки
    async giftBuy(giftId, to, description) {
        const { user, socket } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        if (!to || !giftId || !description) {
            throw new Error('Отсутсвуют необходимые данные')
        }

        if (description.length > 255) {
            description = description.substr(0, 255)
        }

        // Нахожу получателя в базе
        const recipient = await Account.findOne({
            where: {
                username: to,
            },
        })

        // Если получатель не найден - завершаю процедуру
        if (!recipient) {
            throw new Error('Игрок с таким ником не найден')
        }

        // Отправитель
        const account = await Account.findOne({
            where: {
                id: user.id,
            },
        })

        if (recipient.id == account.id) {
            throw new Error('Открытка самому себе? Серьёзно!?')
        }

        // Ищу открытку в базе
        const gift = await Gift.findOne({
            where: {
                id: giftId,
            },
        })

        // Если открытка не найдена - завершаю процедуру
        if (!gift) {
            throw new Error('Такой открытки нет в базе')
        }

        // Если премиум-открытка, то проверяю, может ли пользователь её подарить
        if (gift.isVip) {
            if (!account.vip) {
                throw new Error('Эту открытку могут подарить только игроки, у которых есть VIP-статус')
            }
        }

        // Проверяю, есть ли у игрока достаточно средств
        if (account.wallet < gift.price) {
            throw new Error(`Чтобы подарить эту открытку на счету должно быть как минимум ${gift.price} рублей`)
        }

        // Провожу транзакцию покупки
        await WalletEvent.gift(user.id, gift.price)

        // Дарю открытку
        await AccountGift.create({
            giftId,
            accountId: recipient.id,
            fromId: user.id,
            fromusername: account.username,
            description,
        })

        // Уведомляю о новой открытке
        const ids = this.getUserSocketIds(recipient.id)
        ids.forEach((sid) => {
            socket.broadcast.to(sid).emit('gifts.notify', account.username)
        })
    }

    // Количество новых открыток
    async giftsCount() {
        const { user } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        const count = await AccountGift.count({
            where: {
                accountId: user.id,
                createdAt: {
                    [Op.eq]: sequelize.col('updatedAt'),
                },
            },
        })

        return count
    }

    // Удаление открытки
    async giftRemove(giftId) {
        const { user } = this
        if (!user) {
            throw new Error('Не авторизован')
        }

        const gift = await AccountGift.findOne({
            where: {
                id: giftId,
                accountId: user.id,
            },
        })

        if (!gift) {
            throw new Error('Открытка не найдена')
        }

        AccountGift.destroy({
            where: {
                id: giftId,
                accountId: user.id,
            },
        })
    }
}

module.exports = GiftService
