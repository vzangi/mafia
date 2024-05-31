const { DataTypes, Sequelize } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

// Типы событий
const settingTypes = {
  // Показывать ли инвент
  HIDE_INVENT: 1,

  // Отправлять ли уведомление о начале игры
  GAME_START_NOTIFY: 2,

  // Давать ли звуковое уведомление о начале игры
  GAME_START_SOUND: 3,

  // Количество колонок в игре
  GAME_COL_COUNT: 4,

  // Информация о себе в профиле
  ABOUT_PLAYER: 5,

  // Депозит открыток
  BAG_DEPOSIT: 6,
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

const setSetting = async (settingData) => {
  const { type, accountId, value } = settingData

  const data = { accountId, type }

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

const getSetting = async (settingData) => {
  const { accountId, type } = settingData
  const currentSetting = await AccountSetting.findOne({
    where: { accountId, type },
  })

  if (!currentSetting) return 0

  return currentSetting.value * 1
}

const getStringSetting = async (settingData) => {
  const { accountId, type } = settingData
  const currentSetting = await AccountSetting.findOne({
    where: { accountId, type },
  })

  if (!currentSetting) return ''

  return currentSetting.value
}

// Получение значения настройки отображения инвентаря
AccountSetting.getHideInventSetting = async (accountId) => {
  const val = await getSetting({
    accountId,
    type: settingTypes.HIDE_INVENT,
  })
  return val
}

// Установка настройки отображения инвентаря
AccountSetting.setHideInventSetting = async (accountId, value) => {
  const setting = await setSetting({
    accountId,
    type: settingTypes.HIDE_INVENT,
    value,
  })
  return setting
}

// Получение значения настройки уведомления
AccountSetting.getGameStartNotifySetting = async (accountId) => {
  const val = await getSetting({
    accountId,
    type: settingTypes.GAME_START_NOTIFY,
  })
  return val
}

// Установка настройки уведомления
AccountSetting.setGameStartNotifySetting = async (accountId, value) => {
  const setting = await setSetting({
    accountId,
    type: settingTypes.GAME_START_NOTIFY,
    value,
  })
  return setting
}

// Получение значения настройки уведомления
AccountSetting.getGameStartSoundSetting = async (accountId) => {
  const val = await getSetting({
    accountId,
    type: settingTypes.GAME_START_SOUND,
  })
  return val
}

// Установка настройки уведомления
AccountSetting.setGameStartSoundSetting = async (accountId, value) => {
  const setting = await setSetting({
    accountId,
    type: settingTypes.GAME_START_SOUND,
    value,
  })
  return setting
}

// Получение значения настройки колонок
AccountSetting.getGameColCountSetting = async (accountId) => {
  const val = await getSetting({
    accountId,
    type: settingTypes.GAME_COL_COUNT,
  })
  return val
}

// Установка настройки количества колонок
AccountSetting.setGameColCountSetting = async (accountId, value) => {
  const setting = await setSetting({
    accountId,
    type: settingTypes.GAME_COL_COUNT,
    value,
  })
  return setting
}

// Получение значения настройки колонок
AccountSetting.getAboutSetting = async (accountId) => {
  const val = await getStringSetting({
    accountId,
    type: settingTypes.ABOUT_PLAYER,
  })
  return val
}

// Установка настройки количества колонок
AccountSetting.setAboutSetting = async (accountId, value) => {
  const setting = await setSetting({
    accountId,
    type: settingTypes.ABOUT_PLAYER,
    value,
  })
  return setting
}

// Получение значения депозита
AccountSetting.getBagDepositeSetting = async (accountId) => {
  const val = await getSetting({
    accountId,
    type: settingTypes.BAG_DEPOSIT,
  })
  return val
}

// Изменение значения депозита
AccountSetting.incBagDepositeSetting = async (accountId, incrementValue) => {
  const currentSettingValue = await AccountSetting.getBagDepositeSetting(
    accountId
  )
  const value = currentSettingValue + incrementValue
  const setting = await setSetting({
    accountId,
    type: settingTypes.BAG_DEPOSIT,
    value,
  })
  return setting
}

module.exports = AccountSetting
