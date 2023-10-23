const Account = require('../models/Account')
const service = require('../services/ProfileService')

class Profile {
  // Переход в профиль по id
  async showUserAccount(req, res, next) {
    // Если в параметрах передан id, то ищем пользователя по нему
    // иначе берем текущего пользователя
    const { id } = req.user

    try {
      const profile = await Account.findByPk(id)
      const info = await service.profileInfo(profile, req.user)
      res.render('pages/profile/profile', info)
    } catch (error) {
      console.log(error)
      return next() // на страницу 404
    }
  }

  // Переход в профиль по никнейму
  async showAccountByNik(req, res, next) {
    const { nik } = req.params
    const { user } = req
    try {
      const profile = await Account.findOne({ where: { username: nik } })
      const info = await service.profileInfo(profile, user)
      res.render('pages/profile/profile', info)
    } catch (error) {
      console.log(error)
      return next() // на страницу 404
    }
  }

  // Список друзей
  async friends(req, res, next) {
    // Если в параметрах передан id, то ищем пользователя по нему
    // иначе берем текущего пользователя
    let { nik } = req.params

    try {
      let data
      if (!nik) {
        data = await service.currentUserFriendsList(req.user)
      } else {
        data = await service.friendsList(nik)
      }
      console.log(data)
      res.render('pages/profile/friends', data)
    } catch (error) {
      console.log(error)
      next() // на страницу 404
    }
  }

  // Запросы на дружбу
  async friendsRequest(req, res, next) {
    const { user } = req

    try {
      const friends = await service.friendsRequest(user)
      res.render('pages/profile/friends-requests', friends)
    } catch (error) {
      console.log(error)
      return next() // на страницу 404
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
    const { password, passwordConfirm } = req.body
    const { user } = req

    try {
      await service.changePassword(user, password, passwordConfirm)
      res.json([{ status: 0, msg: 'Пароль успешно изменён' }])
    } catch (error) {
      console.log(error)
      return res.status(400).json([{ msg: error.message }])
    }
  }

  // Кошелёк
  async wallet(req, res, next) {
    const { user } = req

    try {
      const data = await service.wallet(user)
      res.render('pages/profile/wallet', data)
    } catch (error) {
      console.log(error)
      next()
    }
  }

  // Отображение страницы с настойками профиля
  async settings(req, res, next) {
    const { user } = req

    try {
      const data = await service.settings(user)
      res.render('pages/profile/settings', data)
    } catch (error) {
      console.log(error)
      next()
    }
  }

  // Процедура смены автарки
  async changeAvatar(req, res) {
    const { user } = req
    const { avatar } = req.files

    try {
      const fileName = await service.changeAvatar(user, avatar)
      // Возвращаю ответ с именем новой автарки
      res.json({ fileName })
    } catch (error) {
      console.log(error)
      return res.status(400).json([{ msg: error.message }])
    }
  }
}

module.exports = new Profile()
