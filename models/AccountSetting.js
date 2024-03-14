const { DataTypes, Sequelize } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

// Типы событий
const settingTypes = {
  // Показывать ли
  HIDE_INVENT: 1,
}

const AccountSetting = sequelize.define('accountsettings', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  accountId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.INTEGER,
  },
  value: {
    type: DataTypes.STRING,
  },
})

AccountSetting.belongsTo(Account)
Account.hasMany(AccountSetting)

AccountSetting.settingTypes = settingTypes

// Получение значение настройки отображения инвентаря
AccountSetting.getHideInventSetting = async (accountId) => {
  const currentSetting = await AccountSetting.findOne({
    where: {
      accountId,
      type: settingTypes.HIDE_INVENT,
    },
  })

  if (!currentSetting) return 0

  return currentSetting.value * 1
}

// Установка настройки отображения инвентаря
AccountSetting.setHideInventSetting = async (accountId, value) => {
  const data = {
    accountId,
    type: settingTypes.HIDE_INVENT,
  }

  // Беру текущее значение настройки
  const currentSetting = await AccountSetting.findOne({ where: data })

  if (!currentSetting) {
    // Если настройки нет - создаю её
    data.value = value
    const setting = await AccountSetting.create(data)
    return setting
  } else {
    // Если есть - обновляю
    currentSetting.value = value
    await currentSetting.save()
    return currentSetting
  }
}

module.exports = AccountSetting
