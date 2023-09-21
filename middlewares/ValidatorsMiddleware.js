const { body, validationResult } = require('express-validator')
const nikPattern = /^[\-_а-яА-ЯёЁ0-9a-zA-Z\s]+$/g

const email = body('email')
  .trim()
  .notEmpty()
  .withMessage('Почта не указана')
  .isEmail()
  .withMessage('Почта указана неверно')
  .isLength({ max: 30 })
  .withMessage('Длина почты превышает ограничение в 30 символов')

const nik = body('nik')
  .notEmpty()
  .withMessage('Никнейм не указан')
  .isLength({ min: 4, max: 30 })
  .withMessage('Длина никнейма должна быть от 4 до 30 символов')
  .matches(nikPattern)
  .withMessage(
    'Ник может состоть только букв, цифр, дефисов и знаков нижнего подчеркивания'
  )

const password = body('password')
  .notEmpty()
  .withMessage('Пароль не указан')
  .isLength({ min: 6 })
  .withMessage('Длина пароля не может быть меньше 6 символов')
  .isLength({ max: 50 })
  .withMessage('Длина пароля не может быть больше 50 символов')

const accept = body('accept')
  .notEmpty()
  .withMessage('Необходимо подтвердить согласие с правилами сайта')
  .isBoolean()
  .withMessage('Неверный формат подтверждения')

const validator = {
  email,
  nik,
  password,
  accept,
}

const validationMiddleware = (req, res, next) => {
  const result = validationResult(req)
  if (!result.isEmpty()) {
    return res.status(400).json(result.errors)
  }
  next()
}

module.exports = {
  validator,
  validationMiddleware,
}
