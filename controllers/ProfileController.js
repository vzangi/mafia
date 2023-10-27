const service = require('../services/ProfileService')

class Profile {
  // Переход в профиль по никнейму
  async showAccountByNik(req, res, next) {
    try {
      const { nik } = req.params
      const { user } = req

      const data = await service.profileByNik(nik, user)
      res.render('pages/profile/profile', data)
    } catch (error) {
      console.log(error)
      next()
    }
  }

  // Список друзей
  async friends(req, res, next) {
    try {
      let { nik } = req.params
      let data = {}

      if (nik) {
        data = await service.friendsList(nik)
      } else {
        data = await service.currentUserFriendsList(req.user)
      }
      res.render('pages/profile/friends', data)
    } catch (error) {
      console.log(error)
      next()
    }
  }

  // Запросы на дружбу
  async friendsRequest(req, res, next) {
    try {
      const { account } = req

      const data = await service.friendsRequest(account)
      res.render('pages/profile/friends-requests', data)
    } catch (error) {
      console.log(error)
      next()
    }
  }

  // Кошелёк
  async wallet(req, res, next) {
    try {
      const { account } = req

      const data = await service.wallet(account)
      res.render('pages/profile/wallet', data)
    } catch (error) {
      console.log(error)
      next()
    }
  }

  // Отображение страницы с настойками профиля
  async settings(req, res, next) {
    try {
      const { account } = req

      const data = await service.settings(account)
      res.render('pages/profile/settings', data)
    } catch (error) {
      console.log(error)
      next()
    }
  }

  // Форма изменения пароля
  changePasswordForm(req, res) {
    res.render('pages/profile/change-password', {
      title: 'Смена пароля',
    })
  }

  // Процедура изменения пароля
  async changePassword(req, res) {
    try {
      const { password, passwordConfirm } = req.body
      const { account } = req

      await service.changePassword(account, password, passwordConfirm)
      res.json([{ status: 0, msg: 'Пароль успешно изменён' }])
    } catch (error) {
      console.log(error)
      return res.status(400).json([{ msg: error.message }])
    }
  }

  // Процедура смены автарки
  async changeAvatar(req, res) {
    try {
      const { account } = req
      if (!req.files) {
        throw new Error("Аватарка не выбрана")
      }
      const { avatar } = req.files

      const fileName = await service.changeAvatar(account, avatar)
      // Возвращаю ответ с именем новой автарки
      res.json({ fileName })
    } catch (error) {
      console.log(error)
      return res.status(400).json([{ msg: error.message }])
    }
  }
}

module.exports = new Profile()
