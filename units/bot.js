const API_TOKEN = process.env.TELEGRAM_API_TOKEN || 1
const TelegramApi = require('node-telegram-bot-api')
const bot = new TelegramApi(API_TOKEN, { polling: true })
const Account = require('../models/Account')

bot.on('message', async (msg) => {
  const { text } = msg
  const { chat } = msg
  if (!text) return
  if (text.indexOf('/start') != 0) return
  const parts = text.split(' ')

  if (parts.length != 2) return

  const [userid, hash] = parts[1].split('__')

  if (!userid) return
  if (!hash) return

  const account = await Account.findOne({ where: { id: userid } })

  if (!account) return

  if (hash != `${account.id}3301`) return

  if (account.telegramChatId) {
    return bot.sendMessage(chat.id, 'Уведомления уже были подключены')
  }

  account.telegramChatId = chat.id
  await account.save()

  bot.sendMessage(chat.id, 'Уведомления в telegram успешно подключены!')
})

bot.on('polling_error', (msg) => {
  //console.log(msg)
})

module.exports = bot
