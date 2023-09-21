const bcrypt = require('bcrypt')
const pug = require('pug')

// Использую модель данных через ORM sequelize
const Account = require('../models/Account')
const Friend = require('../models/Friend')
const { Op } = require('sequelize')

const correctForm = (friendsCount) => {
    if (friendsCount == 1) return "Друг"
    if (friendsCount < 5) return "Друга"
    if (friendsCount < 20) return "Друзей"

    if (friendsCount % 10 == 1) return "Друг"
    if (friendsCount % 10 == 2) return "Друга"
    if (friendsCount % 10 == 3) return "Друга"
    if (friendsCount % 10 == 4) return "Друга"

    return "Друзей"
}

class Profile {

    async withAccount(req, res, next) {
        if (!req.user) return next()
        const account = await Account.findByPk(req.user.id)
        if (account) {
            req.account = account
        }
        next()
    }

    async showUserAccount(req, res, next) {
        const id = req.params.id || req.user.id
        const account = await Account.findByPk(id)
        if (!account) {
            return next()
        }

        const data = {
            profile: account,
            title: `Профиль игрока ${account.username}`,
            ogimage: process.env.APP_HOST + "/uploads/" + account.avatar

        }

        data.friends = await Friend.findAll({
            where: {
                accountId: account.id,
                [Op.or]: [
                    { status: Friend.statuses.ACCEPTED },
                    { status: Friend.statuses.MARRIED }
                ]
            },
            include: {
                model: Account,
                as: 'friend'
            }
        })

        data.partner = await Friend.findOne({
            where: {
                accountId: account.id,
                status: Friend.statuses.MARRIED
            },
            include: {
                model: Account,
                as: 'friend'
            }
        })


        data.friendsCorrectForm = correctForm(data.friends.length)

        if (req.user) {
            data.isFrends = await Friend.findOne({
                where: {
                    accountId: req.user.id,
                    friendId: account.id
                },
                order: [['id', 'DESC']]
            })
            data.isBlock = await Friend.findOne({
                where: {
                    accountId: account.id,
                    friendId: req.user.id,
                    status: Friend.statuses.BLOCK
                }
            })
            data.havePartner = await Friend.findOne({
                where: {
                    accountId: req.user.id,
                    status: Friend.statuses.MARRIED
                }
            })    
        }

        res.render('profile', data)
    }

    async friends(req, res, next) {
        const id = req.params.id || req.user.id
        const account = await Account.findByPk(id)
        if (!account) {
            return next()
        }

        const friends = await Friend.scope('def').findAll({
            where: {
                accountId: account.id,
                status: Friend.statuses.ACCEPTED
            }
        })
        
        const partner = await Friend.scope('def').findOne({
            where: {
                accountId: account.id,
                status: Friend.statuses.MARRIED
            }
        })

        res.render('friends', {
            profile: account,
            friends,
            partner
        })
    }

    async friendsRequest(req, res, next) {
        if (!req.account) {
            return res.redirect('/login')
        }
        const requests = await Friend.findAll({
            where: {
                friendId: req.account.id,
                [Op.or]: [
                    { status: 0 }, // Дружба
                    { status: 2 }, // Загс
                ]
            },
            include: {
                model: Account,
                as: 'account'
            }
        })

        res.render('friends-requests', {
            profile: req.account,
            requests
        })
    }

    changePasswordForm(req, res) {
        res.render('change-password')
    }

    async changePassword(req, res) {
        const { password, passwordConfirm } = req.body

        if (password != passwordConfirm) {
            return res.status(400).json([{ msg: "Пароли не совпадают" }])
        }

        const user = await Account.findOne({ where: { id: req.user.id } })

        if (!user) {
            return res.status(400).json([{ msg: "Пользователь не найден" }])
        }

        const hash = await bcrypt.hash(password, 10)

        user.update({ password: hash })

        res.json([{ msg: "Пароль успешно изменён" }])
    }
}

module.exports = new Profile()