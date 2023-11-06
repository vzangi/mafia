class BaseAdminController {
  // Проверка на наличие прав
  async isSuperAdmin(req, res, next) {
    const { account } = req
    if (!account || account.role != 1) {
      next(new Error('Недостаточно прав доступа'))
    } else {
      next()
    }
  }
}

module.exports = BaseAdminController
