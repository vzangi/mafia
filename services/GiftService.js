const Gift = require('../models/Gift')
const GiftGroup = require('../models/GiftGroup')
const maxGiftSize = 500_000

class GiftService {
  // Список групп
  async groups() {
    const groups = await GiftGroup.findAll({ order: [['sort']] })
    const data = { groups }
    return data
  }

  // Редактирование группы
  async group(groupId) {
    if (!groupId) {
      throw new Error('id группы не указано')
    }

    const group = await GiftGroup.findByPk(groupId)
    if (!group) {
      throw new Error('Группа с таким id не найдена')
    }

    const gifts = await Gift.findAll({
      where: {
        giftgroupId: groupId,
      },
      order: [['updatedAt', 'DESC']],
    })

    const data = { group, gifts }

    return data
  }

  // Сохранение изменений в базе
  async editGroup(id, name, sort, active) {
    if (!id || !name || !sort) {
      throw new Error('Нет необходимых данных')
    }

    const group = await GiftGroup.findByPk(id)
    if (!group) {
      throw new Error('Группа с таким id не найдена')
    }

    group.name = name
    group.sort = sort
    group.active = active ? 1 : 0
    await group.save()
  }

  // Добавление группы в базу
  async addGroup(name, sort) {
    if (!name || !sort) {
      throw new Error('Нет необходимых данных')
    }

    await GiftGroup.create({ name, sort })
  }

  // Загрузка новой открытки
  async addGift(file, giftgroupId, price, isVip) {
    if (!price || !giftgroupId || !file) {
      throw new Error('Нет необходимых данных')
    }

    if (file.size > maxGiftSize) {
      throw new Error(
        `Размер открытки превышает ограничение ${maxGiftSize / 100} Кб`
      )
    }

    let ext = ''
    if (file.mimetype == 'image/jpeg') ext = 'jpg'
    if (file.mimetype == 'image/png') ext = 'png'
    if (file.mimetype == 'image/gif') ext = 'gif'
    if (file.mimetype == 'image/webp') ext = 'webp'

    if (ext == '') {
      throw new Error('Можно загружать только картинки jpg, png, gif и webp')
    }

    const lastGift = await Gift.findOne({
      order: [['id', 'DESC']],
    })

    let picture = '0001.' + ext
    if (lastGift) {
      picture =
        this._normalizedPictureName(
          lastGift.picture.substr(0, lastGift.picture.indexOf('.')) * 1 + 1
        ) +
        '.' +
        ext
    }

    await file.mv('./public/uploads/gift/' + picture)

    await Gift.create({
      giftgroupId,
      price,
      isVip: isVip ? 1 : 0,
      picture,
    })
  }

  // Удаление открытки
  async removeGift(giftId) {
    if (!giftId) {
      throw new Error('Нет необходимых данных')
    }

    await Gift.destroy({
      where: {
        id: giftId,
      },
    })
  }

  // Форма редактирования открытки
  async giftEditForm(giftId) {
    if (!giftId) {
      throw new Error('Нет необходимых данных')
    }

    const gift = await Gift.findByPk(giftId)
    const groups = await GiftGroup.findAll()

    const data = { gift, groups }
    return data
  }

  // Изменение открытки
  async editGift(file, id, giftgroupId, price, isVip) {
    if (!id || !price || !giftgroupId) {
      throw new Error('Нет необходимых данных')
    }

    const gift = await Gift.findByPk(id)
    if (!gift) {
      throw new Error('Открытка не найдена')
    }

    if (file) {
      if (file.size > maxGiftSize) {
        throw new Error(
          `Размер открытки превышает ограничение ${maxGiftSize / 100} Кб`
        )
      }

      await file.mv('./public/uploads/gift/' + gift.picture)
    }

    gift.giftgroupId = giftgroupId
    gift.price = price
    gift.isVip = isVip ? 1 : 0
    await gift.save()
  }

  // Выдает имя картинки в четырехсимвольном формате
  _normalizedPictureName(name) {
    if (name.length >= 4) return name
    return this._normalizedPictureName('0' + name)
  }
}

module.exports = new GiftService()
