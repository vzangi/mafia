const fs = require('fs')
const Jimp = require('jimp')
const bcrypt = require('bcrypt')
const { Op } = require('sequelize')
const sequelize = require('../units/db')
const BaseService = require('./BaseService')
const Friend = require('../models/Friend')
const AccountGift = require('../models/AccountGift')
const WalletEvents = require('../models/WalletEvents')
const Account = require('../models/Account')
const AccountName = require('../models/AccountName')

class ProfileService extends BaseService {
  async profileInfo(profile, currentUser) {
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

    if (currentUser) {
      data.isFrends = await Friend.findOne({
        where: {
          accountId: currentUser.id,
          friendId: profile.id,
        },
        order: [['id', 'DESC']],
      })
      data.isBlock = await Friend.findOne({
        where: {
          accountId: profile.id,
          friendId: currentUser.id,
          status: Friend.statuses.BLOCK,
        },
      })
      data.havePartner = await Friend.findOne({
        where: {
          accountId: currentUser.id,
          status: Friend.statuses.MARRIED,
        },
      })

      // Зашёл в свой профиль
      if (currentUser.id == profile.id) {
        // Пометить открытки просмотренными
        try {
          await AccountGift.update(
            {
              accountId: currentUser.id,
            },
            {
              where: {
                accountId: currentUser.id,
                createdAt: {
                  [Op.eq]: sequelize.col('updatedAt'),
                },
              },
            }
          )
        } catch (error) {
          console.log(error)
        }
      }
    }

    data.gifts = await AccountGift.scope({
      method: ['withModels', profile.id],
    }).findAll()

    return data
  }

  async currentUserFriendsList(user) {
    const account = await Account.findByPk(user.id)
    return await this.friendsList(account.username)
  }

  async friendsList(nik) {
    const profile = await Account.findOne({
      where: {
        username: nik,
      },
    })

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

    const data = {
      profile,
      friends,
      partner,
      title: `Друзья игрока ${profile.username}`,
    }

    return data
  }

  async friendsRequest(user) {
    const account = await Account.findByPk(user.id)

    const requests = await Friend.scope({
      method: ['requests', account.id],
    }).findAll()

    const data = {
      profile: account,
      requests,
      title: `Запросы в друзья`,
    }

    return data
  }

  async wallet(user) {
    const account = await Account.findByPk(user.id)

    const eventCount = await WalletEvents.count({
      where: {
        accountId: account.id,
      },
    })

    const data = {
      account,
      eventCount,
      title: `Кошелёк - пополнение баланса`,
    }

    return data
  }

  async settings(user) {
    const profile = await Account.findByPk(user.id)

    const nikChanges = await AccountName.findAll({
      where: {
        accountId: user.id,
      },
      order: [['id', 'DESC']],
    })

    const data = {
      profile,
      nikChanges,
      namesChangesCount: nikChanges.length,
      title: `Настройки профиля ${profile.username}`,
    }

    return data
  }

  async changePassword(user, password, passwordConfirm) {
    if (!user) {
      throw new Error('Не авторизован')
    }

    if (!password || !passwordConfirm) {
      throw new Error('Нет необходимых данных')
    }

    if (password != passwordConfirm) {
      throw new Error('Пароли не совпадают')
    }

    try {
      const hash = await bcrypt.hash(password, 10)
      await Account.update({ password: hash }, { where: { id: user.id } })
      return true
    } catch (error) {
      throw new Error('Ошибка при смене пароля')
    }
  }

  async changeAvatar(user, avatar) {
    if (!user || !avatar) throw new Error('Нет необходимых данных')

    let ext = ''
    if (avatar.mimetype == 'image/jpeg') ext = 'jpg'
    if (avatar.mimetype == 'image/png') ext = 'png'
    if (avatar.mimetype == 'image/gif') ext = 'gif'
    if (avatar.mimetype == 'image/webp') ext = 'webp'

    if (ext == '') {
      throw new Error(
        'Можно загружать только фото в формате: jpg, png, gif, webp'
      )
    }

    const rnd1 = Math.ceil(Math.random() * 10000)
    const rnd2 = Math.ceil(Math.random() * 10000)

    // Формирую имя новой автарки
    const fileName = `${user.id}-${rnd1}-${rnd2}.${ext}`

    // Запрещаю загрузку автарок больше 5 мегабайт
    if (avatar.size > 5_000_000) {
      throw new Error('Размер фото не должно превышать ограничение в 5Mb')
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

    return fileName
  }
}

module.exports = new ProfileService()
