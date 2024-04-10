const { hash, compare } = require('bcrypt')
const { compileFile } = require('pug')
const { mail } = require('../units/mailer')
const { createToken } = require('../units/jwt')
const Account = require('../models/Account')
const AccountName = require('../models/AccountName')
const Punishment = require('../models/Punishment')
const { Op } = require('sequelize')
const { getCoolDateTime } = require('../units/helpers')
const saltNumber = 10

class AuthService {
  // Регистрация
  async register(username, email, password, passwordConfirm, accept) {
    const checkEmail = await Account.findOne({ where: { email } })

    if (checkEmail) {
      throw new Error('Email уже используется')
    }

    if (password !== passwordConfirm) {
      throw new Error('Пароли не совпадают')
    }

    const checkNik = await Account.findOne({ where: { username } })

    if (checkNik) {
      throw new Error('Ник уже используется')
    }

    const secondCheck = await AccountName.findOne({ where: { username } })

    if (secondCheck) {
      throw new Error('Ник занят')
    }

    if (accept != 1) {
      throw new Error('Необходимо согласиться с правилами сайта')
    }

    const hashedPassword = await hash(password, saltNumber)

    try {
      await Account.create({
        email,
        username,
        password: hashedPassword,
      })

      this._welcomeEmail(email, username)
    } catch (error) {
      throw new Error('Ошибка при регистрации')
    }
  }

  // Авторизация
  async login(username, password) {
    const user = await Account.findOne({ where: { username } })

    if (!user) {
      throw new Error('Пользователь с таким ником не найден')
    }

    const match = await compare(password, user.password)

    if (!match) {
      throw new Error('Неверное сочетание логина и пароля')
    }

    if (user.status == 0) {
      throw new Error('Необходимо подтвердить почту')
    }

    // Проверяю нет ли запрета на вход
    const hasNoLogin = await Punishment.findOne({
      where: {
        accountId: user.id,
        type: Punishment.types.NO_LOGIN,
        untilAt: {
          [Op.gte]: new Date().toISOString(),
        },
      },
    })

    if (hasNoLogin) {
      throw new Error(
        `Вам запрещено входить на сайт до ${getCoolDateTime(
          hasNoLogin.untilAt
        )}`
      )
    }

    const accessToken = createToken(user)

    return accessToken
  }

  // Подтверждение регистрации
  async accept(email, hash) {
    const match = await compare(email + process.env.SECRET_JWT_KEY, hash)

    if (!match) {
      throw new Error('Токен не верный')
    }

    const user = await Account.findOne({
      where: {
        email: email,
        status: 0,
      },
    })

    if (!user) {
      throw new Error('Пользователь не найден')
    }

    user.update({ status: 1 })

    const accessToken = createToken(user)
    return accessToken
  }

  // Запрос на восстановление пароля
  async restore(email) {
    const user = await Account.findOne({ where: { email } })

    if (!user) {
      throw new Error('Пользователь с таким email не найден')
    }

    if (user.status == 0) {
      throw new Error('Аккаунт привязанный к этому email не подтверждён')
    }

    this._restoreEmail(user)
  }

  // Авторизация по ссылке отправленной на почту для смены пароля
  async restorePassword(email, restoreHash) {
    const account = await Account.findOne({ where: { email } })

    if (!account) {
      throw new Error('Пользователь с таким Email не найден')
    }

    const match = await compare(
      account.email + account.password + process.env.SECRET_JWT_KEY,
      restoreHash
    )

    if (!match) {
      throw new Error('Токен не верный')
    }

    const accessToken = createToken(account)

    return accessToken
  }

  // Отправка сообщения после регистрации
  async _welcomeEmail(email, nik) {
    const registryHash = await hash(
      email + process.env.SECRET_JWT_KEY,
      saltNumber
    )
    const link = `${process.env.APP_HOST}/accept/${email}/${registryHash}`
    const message = compileFile('./views/emails/welkome.pug')({ nik, link })
    mail(email, 'Регистрация на сайте Mafia One', message)
  }

  // Отправка сообщения на почту со ссылкой для смены пароля
  async _restoreEmail(account) {
    const restoreHash = await hash(
      account.email + account.password + process.env.SECRET_JWT_KEY,
      saltNumber
    )
    const link = `${process.env.APP_HOST}/restore/${account.email}/${restoreHash}`
    const message = compileFile('./views/emails/restore.pug')({ link })
    mail(account.email, 'Восстановление пароля на Mafia One', message)
  }

  // Авторизация через VK
  async VK_auth(data) {
    const { payload } = data

    if (!payload) throw new Error('Нет данных')

    console.log(payload, payload.user)

    const { user } = JSON.parse(payload)

    if (!user) throw new Error('Нет пользователя в ответе сервера')

    console.log(user, user.id)

    const account = await Account.findOne({
      where: { email: `${user.id}@vk.com` },
    })

    // Пользователь авторизуется впервые
    if (!account) {
      // Создаю пользователю аккаунт
      const accData = {}
      accData.username = user.id
      accData.email = `${user.id}@vk.com`
      accData.password = await hash(user.id, saltNumber)

      const newAccount = await Account.create(accData)

      // Возвращаю созданный аккаунт, чтобы перенаправить его на страницу для указания ника
      return { account: newAccount }
    } else {
      // Аккаунт подтверждён
      if (account.status == 1) {
        const accessToken = await this.login(
          account.username,
          account.id.toString()
        )
        return { accessToken }
      } else {
        // Возвращаю созданный аккаунт, чтобы перенаправить его на страницу для указания ника
        return { account }
      }
    }
  }

  // Данные для страницы установки ника
  async getMakenickAccount(data) {
    const { id, vkid } = data
    if (!id || !vkid) throw new Error('Нет необходимых данных')

    // Беру аккаунт
    const account = await Account.findOne({
      where: {
        id,
        username: vkid,
        status: 0,
      },
    })
    if (!account) throw new Error('Аккаунт не найден')

    // Проверяю пароль
    const match = await compare(vkid, account.password)
    if (!match) throw new Error('Не верный пароль')

    // Возвращаю аккаунт
    return account
  }

  // Установка ника
  async setnick(data) {
    const account = await this.getMakenickAccount(data)

    const username = data.nik
    if (!username) throw new Error('Ник не указан')

    const hasNick = await Account.findOne({ where: { username } })
    if (hasNick) throw new Error('Ник уже используется')

    const secondCheck = await AccountName.findOne({ where: { username } })
    if (secondCheck) throw new Error('Ник занят')

    // Сохраняю ник
    account.username = username
    account.status = 1
    await account.save()

    // Получаю токен авторизации
    const accessToken = createToken(account)
    return accessToken
  }
}

module.exports = new AuthService()
