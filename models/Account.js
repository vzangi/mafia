const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')

const findNikLimit = 10
const genders = {
  NOTSET: 0,
  MALE: 1,
  FEMALE: 2,
}

const levelBorders = [20, 100, 500, 1000]
const levelNames = ['Новичок', 'Зелёнка', 'Бывалый', 'Профи', 'Босс']

const Account = sequelize.define('account', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  role: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  telegramChatId: {
    type: DataTypes.STRING,
  },
  avatar: {
    type: DataTypes.STRING,
    defaultValue: 'noname.svg',
  },
  gender: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  rank: {
    type: DataTypes.INTEGER,
    defaultValue: 2000,
  },
  level: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  wallet: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
  online: {
    type: DataTypes.BOOLEAN,
    defaultValue: 0,
  },
  noindex: {
    type: DataTypes.BOOLEAN,
    defaultValue: 0,
  },
  skin: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  bg: {
    type: DataTypes.STRING,
  },
  vipTo: {
    type: DataTypes.DATE,
  },
  kopeiki: {
    type: DataTypes.VIRTUAL(DataTypes.INTEGER),
    get() {
      return Math.floor((this.wallet - Math.floor(this.wallet)) * 100)
    },
    set() {
      throw new Error('Do not try to set the `vip` value!')
    },
  },
  vip: {
    type: DataTypes.VIRTUAL(DataTypes.INTEGER),
    get() {
      if (!this.vipTo) return 0
      const now = new Date()
      if (this.vipTo > now) return 1
      return 0
    },
    set() {
      throw new Error('Do not try to set the `vip` value!')
    },
  },
})

// Функция поиска игроков по нику
Account.findAccountsByNik = async (nik) => {
  const accounts = await Account.findAll({
    where: {
      username: {
        [Op.substring]: nik,
      },
      status: {
        [Op.ne]: 0,
      },
    },
    attributes: ['id', 'username', 'online', 'avatar', 'vipTo', 'vip'],
    limit: findNikLimit,
  })
  return accounts
}

Account.genders = genders
Account.levelBorders = levelBorders
Account.levelNames = levelNames

Account.getLevelByBorder = (border) => {
  for (const level in levelBorders)
    if (levelBorders[level] > border) return level
  return levelBorders.length
}

module.exports = Account
