const Account = require('../../models/Account')
const AccountThing = require('../../models/AccountThing')
const Thing = require('../../models/Thing')
const ThingType = require('../../models/ThingType')
const ThingClass = require('../../models/ThingClass')
const ThingCollection = require('../../models/ThingCollection')
const NaborThing = require('../../models/NaborThing')
const maxPictureSize = 500_000

class MarketService {
  async thingsList() {
    const things = await Thing.findAll({
      order: [['updatedAt', 'DESC']],
      include: [
        { model: ThingType },
        { model: ThingClass },
        { model: ThingCollection },
      ],
    })
    const classes = await ThingClass.findAll({ order: [['sort']] })
    const collections = await ThingCollection.findAll({ order: [['sort']] })
    const data = {
      things,
      classes,
      collections,
    }
    return data
  }

  // Список типов
  async typesList() {
    const types = await ThingType.findAll({ order: [['sort']] })
    const data = { types }
    return data
  }

  // Список классов
  async classesList() {
    const classes = await ThingClass.findAll({ order: [['sort']] })
    const data = { classes }
    return data
  }

  // Список коллекций
  async collectionsList() {
    const collections = await ThingCollection.findAll({ order: [['sort']] })
    const data = { collections }
    return data
  }

  // Добавление типа предмета
  async createType(name, sort) {
    if (!name || !sort) {
      throw new Error('Нет необходимых данных')
    }
    await ThingType.create({
      name,
      sort,
    })
  }

  // Добавление коллекции
  async createCollection(name, sort) {
    if (!name || !sort) {
      throw new Error('Нет необходимых данных')
    }
    await ThingCollection.create({
      name,
      sort,
    })
  }

  // Редактирование типа
  async editType(id) {
    if (!id) {
      throw new Error('Нет необходимых данных')
    }
    const type = await ThingType.findByPk(id)
    const data = { type }
    return data
  }

  // Редактирование класса
  async editClass(id) {
    if (!id) {
      throw new Error('Нет необходимых данных')
    }
    const thingClass = await ThingClass.findByPk(id)
    const data = { thingClass }
    return data
  }

  // Редактирование коллекции
  async editCollection(id) {
    if (!id) {
      throw new Error('Нет необходимых данных')
    }
    const collection = await ThingCollection.findByPk(id)
    const data = { collection }
    return data
  }

  // Обновление данных типа
  async updateType(id, name, sort) {
    if (!id || !name || !sort) {
      throw new Error('Нет необходимых данных')
    }
    const type = await ThingType.findByPk(id)
    if (!type) {
      throw new Error('Тип не найден')
    }

    type.name = name
    type.sort = sort
    await type.save()
  }

  // Обновление данных класса
  async updateClass(id, name, sort) {
    if (!id || !name || !sort) {
      throw new Error('Нет необходимых данных')
    }
    const thingClass = await ThingClass.findByPk(id)
    if (!thingClass) {
      throw new Error('Тип не найден')
    }

    thingClass.name = name
    thingClass.sort = sort
    await thingClass.save()
  }

  // Обновление данных коллекции
  async updateCollection(id, name, sort) {
    if (!id || !name || !sort) {
      throw new Error('Нет необходимых данных')
    }
    const collection = await ThingCollection.findByPk(id)
    if (!collection) {
      throw new Error('Тип не найден')
    }

    collection.name = name
    collection.sort = sort
    await collection.save()
  }

  // Страница добавления вещи
  async addThing() {
    const data = {}
    data.thingTypes = await ThingType.findAll({ order: [['sort']] })
    data.thingClasses = await ThingClass.findAll({ order: [['sort']] })
    data.thingCollections = await ThingCollection.findAll({ order: [['sort']] })

    data.things = await Thing.findAll({
      order: [['thingtypeId'], ['thingcollectionId'], ['thingclassId']],
      include: [{ model: ThingCollection }, { model: ThingType }],
    })

    return data
  }

  // Процедура создания вещи
  async createThing(
    name,
    description,
    price,
    forsale,
    thingtypeId,
    thingclassId,
    thingcollectionId,
    items,
    picture
  ) {
    if (
      !name ||
      !description ||
      !price ||
      !thingtypeId ||
      !thingclassId ||
      !items ||
      !picture
    ) {
      throw new Error('Нет необходимых данных')
    }

    if (picture.size > maxPictureSize) {
      throw new Error(
        `Размер картинки превышает ограничение ${maxPictureSize / 100} Кб`
      )
    }

    let ext = ''
    if (picture.mimetype == 'image/svg+xml') ext = 'svg'
    if (picture.mimetype == 'image/png') ext = 'png'
    if (picture.mimetype == 'image/gif') ext = 'gif'
    if (picture.mimetype == 'image/webp') ext = 'webp'

    if (ext == '') {
      throw new Error('Можно загружать только картинки svg, png, gif и webp')
    }

    const lastThing = await Thing.findOne({
      order: [['id', 'DESC']],
    })

    let pictureName = '0001.' + ext
    if (lastThing) {
      pictureName =
        this._normalizedPictureName(
          lastThing.picture.substr(0, lastThing.picture.indexOf('.')) * 1 + 1
        ) +
        '.' +
        ext
    }

    // Сохраняю картинку
    await picture.mv('./public/uploads/thing/' + pictureName)

    // Создаю вещь
    const newThing = await Thing.create({
      name,
      description,
      price,
      forsale: forsale ? 1 : 0,
      thingtypeId,
      thingclassId,
      thingcollectionId: thingcollectionId ? thingcollectionId : null,
      picture: pictureName,
    })

    // Если создали набор или кейс
    if (thingtypeId == 3 || thingtypeId == 4) {
      const thingIds = JSON.parse(items)
      // Создаю связи с вещами, которые будут в нём
      thingIds.forEach(async (thingId) => {
        await NaborThing.create({
          naborId: newThing.id,
          thingId,
        })
      })
    }
  }

  // Страница редактирования вещи
  async editThing(id) {
    if (!id) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await Thing.findByPk(id)

    if (!thing) {
      throw new Error('Вещь не найдена')
    }
    const data = {}
    data.thing = thing
    data.thingTypes = await ThingType.findAll({ order: [['sort']] })
    data.thingClasses = await ThingClass.findAll({ order: [['sort']] })
    data.thingCollections = await ThingCollection.findAll({ order: [['sort']] })
    data.things = await Thing.findAll({
      order: [['thingtypeId'], ['thingcollectionId'], ['thingclassId']],
      include: [{ model: ThingCollection }, { model: ThingType }],
    })

    // Для набора или кейса подгружаю также и входящие в него вещи
    data.items = await NaborThing.findAll({
      where: { naborId: id },
      include: [{ model: Thing }],
    })

    return data
  }

  // Процедура обновления вещи
  async updateThing(
    id,
    name,
    description,
    price,
    forsale,
    thingtypeId,
    thingclassId,
    thingcollectionId,
    items,
    picture
  ) {
    if (
      !id ||
      !name ||
      !description ||
      !price ||
      !thingtypeId ||
      !thingclassId ||
      !items
    ) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await Thing.findByPk(id)

    if (!thing) {
      throw new Error('Вещь не найдена')
    }

    if (picture) {
      const pictureName = thing.picture
      await picture.mv('./public/uploads/thing/' + pictureName)
    }

    thing.name = name
    thing.description = description
    thing.price = price
    thing.forsale = forsale ? 1 : 0
    thing.thingtypeId = thingtypeId
    thing.thingclassId = thingclassId
    thing.thingcollectionId = thingcollectionId ? thingcollectionId : null
    await thing.save()

    // Для набора и кейса обновляю список вещей в них
    if (thingtypeId == 3 || thingtypeId == 4) {
      const thingIds = JSON.parse(items)
      // Удаляю предыдущие записи
      await NaborThing.destroy({ where: { naborId: id } })
      // Создаю новые связи с вещами, которые будут в нём
      thingIds.forEach(async (thingId) => {
        await NaborThing.create({
          naborId: id,
          thingId,
        })
      })
    }
  }

  // Подарить вещь игроку
  async giftThing(thingId, username) {
    if (!thingId || !username) {
      throw new Error('Нет необходимых данных')
    }

    const thing = await Thing.findByPk(thingId)

    if (!thing) {
      throw new Error('Вещь не найдена')
    }

    const account = await Account.findOne({ where: { username } })

    if (!account) {
      throw new Error('Пользователь не найден')
    }

    await AccountThing.create({
      thingId,
      accountId: account.id,
    })
  }

  // Выдает имя картинки в четырехсимвольном формате
  _normalizedPictureName(name) {
    if (name.length >= 4) return name
    return this._normalizedPictureName('0' + name)
  }
}

module.exports = new MarketService()
