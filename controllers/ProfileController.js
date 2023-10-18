const bcrypt = require('bcrypt')
const { Op } = require('sequelize')
const Account = require('../models/Account')
const Friend = require('../models/Friend')
const AccountGift = require('../models/AccountGift')
const AccountName = require('../models/AccountName')
const WalletEvents = require('../models/WalletEvents')
const fs = require('fs')
const Jimp = require('jimp')
const Gift = require('../models/Gift')

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

    data.friends = await Friend.scope({
      method: ['friends', profile.id],
    }).findAll()

    data.partner = await Friend.scope({
      method: ['partner', profile.id],
    }).findOne()

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

    data.gifts = await AccountGift.scope({
      method: ['withModels', profile.id],
    }).findAll()

    // console.log(data.gifts)

    res.render('pages/profile/profile', data)
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

    res.render('pages/profile/friends', {
      profile,
      friends,
      partner,
      title: `Друзья игрока ${profile.username}`,
    })
  }

  // Запросы на дружбу
  async friendsRequest(req, res, next) {
    const { account } = req

    const requests = await Friend.scope({
      method: ['requests', account.id],
    }).findAll()

    res.render('pages/profile/friends-requests', {
      profile: account,
      requests,
      title: `Запросы в друзья`,
    })
  }

  // Форма изменения пароля
  changePasswordForm(req, res) {
    res.render('pages/profile/change-password', {
      title: 'Смена пароля',
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
        accountId: account.id,
      },
    })

    res.render('pages/profile/wallet', {
      account,
      eventCount,
      title: `Кошелёк - пополнение баланса`,
    })
  }

  // Отображение страницы с настойками профиля
  async settings(req, res) {
    const { id } = req.user
    const profile = await Account.findByPk(id)
    if (!profile) {
      return next() // на страницу 404
    }

    const namesChangesCount = await AccountName.count({
      where: {
        accountId: id,
      },
    })

    res.render('pages/profile/settings', {
      profile,
      namesChangesCount,
      title: `Настройки профиля ${profile.username}`,
    })
  }

  // Процедура смены автарки
  async changeAvatar(req, res) {
    const { user } = req
    if (!user) return res.status(400).json({ msg: 'Не авторизован' })

    const { avatar } = req.files
    if (!avatar) return res.status(400).json({ msg: 'Нет необходимых данных' })

    let ext = ''
    if (avatar.mimetype == 'image/jpeg') ext = 'jpg'
    if (avatar.mimetype == 'image/png') ext = 'png'
    if (avatar.mimetype == 'image/gif') ext = 'gif'
    if (avatar.mimetype == 'image/webp') ext = 'webp'

    if (ext == '') {
      return res.status(400).json({
        msg: 'Можно загружать только фото в формате: jpg, png, gif, webp',
      })
    }

    const rnd1 = Math.ceil(Math.random() * 10000)
    const rnd2 = Math.ceil(Math.random() * 10000)

    // Формирую имя новой автарки
    const fileName = `${user.id}-${rnd1}-${rnd2}.${ext}`

    // Запрещаю загрузку автарок больше 5 мегабайт
    if (avatar.size > 5_000_000) {
      return res
        .status(400)
        .json({ msg: 'Размер фото не должно превышать ограничение в 5Mb' })
    }

    // Если размер аватарки больше 300 Кб, то сжимаю её
    if (avatar.size > 300_000) {
      const img = await Jimp.read(avatar.data)
      img.resize(250, Jimp.AUTO).writeAsync('./public/uploads/' + fileName)
    } else {
      // Перемещаю загруженное фото в папку с загрузками
      await avatar.mv('./public/uploads/' + fileName)
    }

    // Достаю профиль
    const profile = await Account.findByPk(user.id)

    // Если предыдущее фото не то, что даётся по умолчанию
    if (profile.avatar != 'noname.svg') {
      // Удаляю предыдущее фото, чтобы не захламлять сервер
      fs.unlink(`${__dirname}/../public/uploads/${profile.avatar}`, (err) => {
        console.log(err)
      })
    }

    // Сохраняю автарку в базу
    profile.avatar = fileName
    await profile.save()

    // Возвращаю ответ с именем новой автарки
    res.json({ fileName })
  }
}

module.exports = new Profile()
