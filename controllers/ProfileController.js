const bcrypt = require('bcrypt')
const { Op } = require('sequelize')
const Account = require('../models/Account')
const Friend = require('../models/Friend')
const WalletEvents = require('../models/WalletEvents')

class Profile {

  // Переход в профиль
  async showUserAccount(req, res, next) {
    // Если в параметрах передан id, то ищем пользователя по нему
    // иначе берем текущего пользователя
    const id = req.params.id || req.user.id
    const profile = await Account.findByPk(id)
    if (!profile) {
      return next() // на страницу 404
    }

    const data = {
      profile,
      title: `Профиль игрока ${profile.username}`,
      ogimage: process.env.APP_HOST + '/uploads/' + profile.avatar,
    }

    data.friends = await Friend.scope({ method: ['friends', profile.id] }).findAll()

    data.partner = await Friend.scope({ method: ['partner', profile.id] }).findOne()

    data.friendsCorrectForm = Friend.correctForm(data.friends.length)

    if (req.user) {
      data.isFrends = await Friend.findOne({
        where: {
          accountId: req.user.id,
          friendId: profile.id,
        },
        order: [['id', 'DESC']],
      })
      data.isBlock = await Friend.findOne({
        where: {
          accountId: profile.id,
          friendId: req.user.id,
          status: Friend.statuses.BLOCK,
        },
      })
      data.havePartner = await Friend.findOne({
        where: {
          accountId: req.user.id,
          status: Friend.statuses.MARRIED,
        },
      })
    }

    res.render('pages/profile', data)
  }

  // Список друзей
  async friends(req, res, next) {
    // Если в параметрах передан id, то ищем пользователя по нему
    // иначе берем текущего пользователя
    const id = req.params.id || req.user.id
    const profile = await Account.findByPk(id)
    if (!profile) {
      return next() // на страницу 404
    }

    const friends = await Friend.scope('def').findAll({
      where: {
        accountId: profile.id,
        status: Friend.statuses.ACCEPTED,
      },
    })

    const partner = await Friend.scope('def').findOne({
      where: {
        accountId: profile.id,
        status: Friend.statuses.MARRIED,
      },
    })

    res.render('pages/friends', {
      profile,
      friends,
      partner,
      title: `Друзья игрока ${profile.username}`
    })
  }

  // Запросы на дружбу
  async friendsRequest(req, res, next) {
    const { account } = req

    const requests = await Friend.scope({method:['requests', account.id]}).findAll()

    res.render('pages/friends-requests', {
      profile: account,
      requests,
      title: `Запросы в друзья`
    })
  }

  // Форма изменения пароля
  changePasswordForm(req, res) {
    res.render('pages/change-password', {
      title: 'Смена пароля'
    })
  }

  // Процедура изменения пароля
  async changePassword(req, res) {
    const { password, passwordConfirm } = req.body

    if (password != passwordConfirm) {
      return res.status(400).json([{ msg: 'Пароли не совпадают' }])
    }

    try {
      const hash = await bcrypt.hash(password, 10)
      await Account.update({ password: hash }, { where: { id: req.user.id } })
      res.json([{ status: 0, msg: 'Пароль успешно изменён' }])
    } catch (error) {
      console.log(error)
      res.json([{ status: 1, msg: 'Ошибка при изменении пароля' }])
    }
  }

  // Кошелёк
  async wallet(req, res) {
    const { account } = req
    const eventCount = await WalletEvents.count({
      where: {
        accountId: account.id
      }
    })

    res.render('pages/wallet', { 
      account, 
      eventCount,
      title: `Кошелёк - пополнение баланса`,
    })
  }
}

module.exports = new Profile()
