const smiles = require('../units/smiles')
const Contest = require('../models/Contest')
const GamePlayer = require('../models/GamePlayer')
const Account = require('../models/Account')
const GameEvent = require('../models/GameEvent')
const WalletEvent = require('../models/WalletEvents')
const Notification = require('../models/Notification')
const Report = require('../models/Report')
const { online } = require('../units/AccountHelper')
const { mail } = require('../units/mailer')
const htmlspecialchars = require('htmlspecialchars')
const { Op } = require('sequelize')

class PagesService {
  async lobbi(user) {
    const data = { smiles }
    const playersInTop = 3

    data.contests = await Contest.scope('active').findAll()

    data.top = await GameEvent.scope('top').findAll({ limit: playersInTop })
    data.intop = false

    if (user) {
      // Проверяю, находится ли пользователь в игре
      const playerInGame = await GamePlayer.findOne({
        where: {
          accountId: user.id,
          status: [
            GamePlayer.playerStatuses.IN_GAME,
            GamePlayer.playerStatuses.FREEZED,
          ],
        },
      })

      // Если да - прикрепляю номер заявки
      if (playerInGame) {
        data.gameId = playerInGame.gameId
      }

      const hasInTop = await GameEvent.findOne({
        where: {
          type: GameEvent.eventTypes.TOPWEEK,
          accountId: user.id,
        },
      })

      if (hasInTop) {
        data.intop = true

        //Место в топе
        const [place, player] = await GameEvent.positionInTop(user.id)
        if (place > playersInTop) {
          data.place = place
          data.playerInTop = player
        }
      }
    }

    return data
  }

  async online() {
    const users = await online()
    return users
  }

  async topOfWeek(user) {
    const data = {}
    const playersInTop = 10

    data.top = await GameEvent.scope('top').findAll({ limit: playersInTop })

    if (user) {
      //Место в топе
      const [place, player] = await GameEvent.positionInTop(user.id)
      if (place && place > playersInTop) {
        data.place = place
        data.playerInTop = player
      }
    }

    return data
  }

  async clearTopOfWeek(secret) {
    const s = process.env.CLEAR_SECRET || 123
    if (secret != s) throw new Error('Неверные данные')

    // Беру трёх победителей
    const top = await GameEvent.scope('top').findAll({ limit: 3 })

    // Распределение призового фонда
    const prizes = [600, 300, 100]

    // Прохожусь по каждому победителю
    for (let index = 0; index < top.length; index++) {
      const player = top[index]

      console.log(player.accountId, player.username, prizes[index])

      // Закидываю игроку выигрыш
      await WalletEvent.payment(player.accountId, prizes[index])

      // Отправляю уведомление
      const message = `Вы получили ${prizes[index]} рублей за ${
        index + 1
      }-е место в топе недели!`
      const newNotify = await Notification.create({
        accountId: player.accountId,
        message,
        level: 4,
      })

      // Заменяю типы событий, чтобы очистить список топа недели
      await GameEvent.update(
        {
          type: GameEvent.eventTypes.TOPWEEK + 10,
        },
        {
          where: {
            type: GameEvent.eventTypes.TOPWEEK,
          },
        }
      )
    }
  }

  async users() {
    const data = {}

    data.users = await Account.findAll({
      order: [['id', 'desc']],
    })

    return data
  }

  async report(req) {
    const { body, account } = req
    if (!body) throw new Error('Нет необходимых данных')

    const { message } = body
    if (!message) throw new Error('Нет необходимых данных')

    const data = { message }

    if (req.files) {
      const { screen } = req.files

      if (!screen) throw new Error('Нет необходимых данных')

      let ext = ''
      if (screen.mimetype == 'image/jpeg') ext = 'jpg'
      if (screen.mimetype == 'image/png') ext = 'png'

      if (ext == '') {
        throw new Error('Можно загружать только фото в формате: jpg, png')
      }

      const rnd1 = Math.ceil(Math.random() * 10000)
      const rnd2 = Math.ceil(Math.random() * 10000)

      // Формирую имя новой автарки
      const fileName = `${account.id}-${rnd1}-${rnd2}.${ext}`

      // Запрещаю загрузку файлов больше 1 мегабайт
      if (screen.size > 1_000_000) {
        throw new Error('Размер фото не должно превышать ограничение в 1Mb')
      }

      await screen.mv('./public/uploads/' + fileName)

      data.screen = `/uploads/${fileName}`
    }

    console.log(data, account.username)
  }

  async sendReport(req) {
    const { body, account } = req
    if (!body) throw new Error('Нет необходимых данных')

    if (!account) throw new Error('Не авторизован')

    const { rfmessage, rftheme } = body
    if (!rfmessage || !rftheme) throw new Error('Нет необходимых данных')

    if (rftheme != 1 && rftheme != 2 && rftheme != 3)
      throw new Error('Неверное значение темы обращения')

    const data = {
      message: htmlspecialchars(rfmessage),
      theme: rftheme,
      accountId: account.id,
    }

    if (data.message.length > 1000)
      throw new Error('Сообщение больше ограничения в 1000 символов.')

    const hasReport = await Report.findOne({
      where: {
        accountId: data.accountId,
        createdAt: {
          [Op.gt]: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // Час
        },
      },
    })

    if (hasReport)
      throw new Error('В течении часа можно отправить только один отзыв')

    if (req.files) {
      const { rffile } = req.files

      if (!rffile) throw new Error('Нет необходимых данных')

      let ext = ''
      if (rffile.mimetype == 'image/jpeg') ext = 'jpg'
      if (rffile.mimetype == 'image/png') ext = 'png'

      if (ext == '') {
        throw new Error('Можно загружать только фото в формате: jpg, png')
      }

      const rnd1 = Math.ceil(Math.random() * 10000)
      const rnd2 = Math.ceil(Math.random() * 10000)

      // Формирую имя новой автарки
      const fileName = `${account.id}-scr-${rnd1}-${rnd2}.${ext}`

      // Запрещаю загрузку файлов больше 1 мегабайт
      if (rffile.size > 1_000_000) {
        throw new Error('Размер фото не должно превышать ограничение в 1Mb')
      }

      await rffile.mv('./public/uploads/' + fileName)

      data.screen = `/uploads/${fileName}`
    }

    const theme = `[${this._getTheme(rftheme).toUpperCase()}] от ${
      account.username
    }`

    const email = process.env.REPORT_EMAIL
    const message = data.message
    const attachments = []

    if (data.screen) {
      attachments.push({
        filename: data.screen.replace('/uploads/', ''),
        path: process.cwd() + '/public' + data.screen,
      })
    }

    await mail(email, theme, message, attachments)

    await Report.create(data)
  }

  _getTheme(theme) {
    switch (theme * 1) {
      case 1:
        return 'предложение'
      case 2:
        return 'баг'
      case 3:
        return 'отзыв'
    }
    return 'newer'
  }
}

module.exports = new PagesService()
