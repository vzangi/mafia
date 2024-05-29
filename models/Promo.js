const { DataTypes } = require('sequelize')
const sequelize = require('../units/db')
const AccountPromo = require('./AccountPromo')
const AccountThing = require('./AccountThing')

const promos = {
  VIP_ON_WEEK: 1,
}

const Promo = sequelize.define('promos', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  limitation: {
    type: DataTypes.INTEGER,
  },
  fromDate: {
    allowNull: false,
    type: DataTypes.DATE,
  },
  toDate: {
    allowNull: false,
    type: DataTypes.DATE,
  },
})

// Акция: VIP статус на неделю
const vipOnWeek = async (promo, accountId) => {
  // Фиксирую участие в акции
  await AccountPromo.create({ accountId, promoId: promo.id })

  // Если акция с ограниченным числом участников, то уменьшаю лимит
  if (promo.limitation !== null) {
    promo.limitation -= 1
    await promo.save()
  }

  // Кладу пропуск в инвент игрока
  await AccountThing.create({ accountId, thingId: 1 })
  return {
    message: 'Вы получили недельный VIP-пропуск. Он уже в вашем инвентаре!',
  }
}

// Процедура активации промокода
Promo.runPromo = async (promo, accountId) => {
  if (promo.limitation !== null && promo.limitation <= 0)
    throw new Error('Лимит по акции исчерпан')

  const date = new Date().getTime()

  if (date < new Date(promo.fromDate).getTime())
    throw new Error('Акция ещё не началась')

  if (date > new Date(promo.toDate).getTime())
    throw new Error('Срок проведения акции истёк')

  if (promo.id === promos.VIP_ON_WEEK) return await vipOnWeek(promo, accountId)
  throw new Error('Не удалось активировать промокод')
}

Promo.promos = promos

module.exports = Promo
