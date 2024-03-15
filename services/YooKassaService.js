class YooKassaService {
  // Пришёл ответ от ЮМоney на тестовую оплату
  async testResponse(data) {
    console.log(data)
  }
}

module.exports = new YooKassaService()
