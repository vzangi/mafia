const Gift = require('../models/Gift')
const GiftGroup = require('../models/GiftGroup')

const normalizedPictureName = (name) => {
  if (name.length >= 4) return name
  return normalizedPictureName('0' + name)
}

class Gifts {
  gift(req, res) {
    const { to } = req.query

    res.render('pages/gift', { to })
  }

  async groups(req, res) {
    const { account } = req
    if (!account || account.role != 1) res.redirect('/')

    const groups = await GiftGroup.findAll({ order: [['sort']] })

    res.render('pages/admin/giftGroups', { groups })
  }

  async group(req, res) {
    const { account } = req
    if (!account || account.role != 1) res.redirect('/')

    const { id } = req.query
    if (!id) res.redirect('/gift/groups')

    const group = await GiftGroup.findByPk(id)
    if (!group) res.redirect('/gift/groups')

    res.render('pages/admin/giftGroupEdit', { group })
  }

  async editGroup(req, res) {
    const { account } = req
    if (!account || account.role != 1) res.redirect('/')

    const { id, name, sort, active } = req.body
    if (!id || !name || !sort) res.redirect('/gift/groups')

    const group = await GiftGroup.findByPk(id)
    if (!group) res.redirect('/gift/groups')

    group.name = name
    group.sort = sort
    group.active = active ? 1 : 0
    await group.save()

    res.redirect('/gift/groups')
  }

  async addGroup(req, res) {
    const { account } = req
    if (!account || account.role != 1) res.redirect('/')

    const { name, sort } = req.body
    if (!name || !sort) res.redirect('/gift/groups')

    await GiftGroup.create({
      name,
      sort,
    })

    res.redirect('/gift/groups')
  }

  async addGift(req, res) {
    try {
      const { account } = req
      if (!account || account.role != 1) res.redirect('/')

      const { giftgroupId, price, isVip } = req.body
      if (!price || !giftgroupId) res.redirect('/gift/groups')

      const { file } = req.files
      if (!file) res.redirect('/gift/groups')

      // Запрещаю загрузку открыток размером больше 500 kбайт
      if (file.size > 500_000) res.redirect('/gift/groups')

      let ext = ''
      if (file.mimetype == 'image/jpeg') ext = 'jpg'
      if (file.mimetype == 'image/png') ext = 'png'
      if (file.mimetype == 'image/gif') ext = 'gif'
      if (file.mimetype == 'image/webp') ext = 'webp'

      if (ext == '') res.redirect('/gift/groups')

      const lastGift = await Gift.findOne({
        order: [['id', 'DESC']],
      })

      let picture = '0001.' + ext
      if (lastGift) {
        picture =
          normalizedPictureName(
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

      res.redirect('/gift/groups')
    } catch (error) {
      console.log(error)
      res.redirect('/gift/groups')
    }
  }
}

module.exports = new Gifts()
