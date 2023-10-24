const service = require('../services/GiftService')

class Gifts {
  // Проверка на наличие прав
  isSuperAdmin(req, res, next) {
    const { account } = req
    if (!account || account.role != 1) {
      return res.redirect('/gift')
    }
    next()
  }

  // Список открыток
  gift(req, res) {
    const { to } = req.query

    res.render('pages/gift', { to, title: 'Подарить открытку' })
  }

  // Список групп
  async groups(req, res) {
    try {
      const data = await service.groups()
      res.render('pages/admin/giftGroups', data)
    } catch (error) {
      console.log(error)
      res.redirect('/gift')
    }
  }

  // Форма редактирования группы
  async group(req, res) {
    try {
      const { id } = req.query

      const data = await service.group(id)
      res.render('pages/admin/giftGroupEdit', data)
    } catch (error) {
      console.log(error)
      res.redirect('/gift/groups')
    }
  }

  // Сохранение изменений в базе
  async editGroup(req, res) {
    try {
      const { id, name, sort, active } = req.body

      await service.editGroup(id, name, sort, active)
    } catch (error) {
      console.log(error)
    }
    res.redirect('/gift/groups')
  }

  // Добавление группы в базу
  async addGroup(req, res) {
    try {
      const { name, sort } = req.body

      await service.addGroup(name, sort)
    } catch (error) {
      console.log(error)
    }
    res.redirect('/gift/groups')
  }

  // Загрузка новой открытки
  async addGift(req, res) {
    try {
      const { giftgroupId, price, isVip } = req.body
      const { file } = req.files

      await service.addGift(file, giftgroupId, price, isVip)
    } catch (error) {
      console.log(error)
    }
    res.redirect('/gift/groups')
  }
}

module.exports = new Gifts()
