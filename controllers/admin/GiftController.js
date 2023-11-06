const service = require('../../services/admin/GiftService')
const BaseAdminController = require('./BaseAdminController')

class GiftController extends BaseAdminController {
  // Список групп
  async groups(req, res, next) {
    try {
      const data = await service.groups()
      res.render('pages/admin/gifts/groups', data)
    } catch (error) {
      next(error)
    }
  }

  // Форма редактирования группы
  async group(req, res, next) {
    try {
      const { id } = req.params
      const data = await service.group(id)
      res.render('pages/admin/gifts/groupEdit', data)
    } catch (error) {
      next(error)
    }
  }

  // Сохранение изменений в базе
  async editGroup(req, res, next) {
    try {
      const { id, name, sort, active } = req.body
      await service.editGroup(id, name, sort, active)
      res.redirect('/gift/groups')
    } catch (error) {
      next(error)
    }
  }

  // Добавление группы в базу
  async addGroup(req, res, next) {
    try {
      const { name, sort } = req.body
      await service.addGroup(name, sort)
      res.redirect('/gift/groups')
    } catch (error) {
      next(error)
    }
  }

  // Загрузка новой открытки
  async addGift(req, res, next) {
    const { giftgroupId, price, isVip } = req.body
    try {
      const { file } = req.files
      await service.addGift(file, giftgroupId, price, isVip)
      res.redirect(`/gift/group/${giftgroupId}`)
    } catch (error) {
      next(error)
    }
  }

  // Загрузка новой открытки
  async giftEditForm(req, res, next) {
    try {
      const { id } = req.params
      const data = await service.giftEditForm(id)
      res.render('pages/admin/gifts/edit', data)
    } catch (error) {
      next(error)
    }
  }

  // Удаление открытки
  async removeGift(req, res, next) {
    try {
      const { giftId } = req.body
      await service.removeGift(giftId)
      res.json([{ msg: 'Открытка удалена' }])
    } catch (error) {
      next(error)
    }
  }

  // Изменение открытки
  async editGift(req, res, next) {
    try {
      const { id, giftgroupId, price, isVip } = req.body
      let file = null
      if (req.files) {
        file = req.files.file
      }
      await service.editGift(file, id, giftgroupId, price, isVip)
      res.redirect(`/gift/group/${giftgroupId}`)
    } catch (error) {
      next(error)
    }
  }
}

module.exports = new GiftController()
