const seoData = {
  '/': {
    title: 'Браузерная онлайн игра - Mafia One',
    description:
      'Приглашаем в мафию. Это отличное место, чтобы поиграть с друзьями в легендарную игру.',
    ogimage: process.env.APP_HOST + '/images/logo.png',
  },
  '/login': {
    title: 'Вход на сайт Mafia One',
    description: 'На этой странице вы можете ввести данные для авторизации',
  },
  '/lobbi': {
    title: 'Лобби сайта Mafia One',
    description:
      'На этой странице вы можете пообщаться с игроками Mafia One и создать заявку, чтобы начать игру',
  },
  '/registration': {
    title: 'Регистрация на сайте Mafia One',
    description:
      'На этой странице вы можете зарегестрироваться на сайте Mafia One',
  },
  '/restore': {
    title: 'Восстановление пароля',
    description:
      'На этой странице вы можете указать почтовый ящик для восстановления забытого пароля от аккаунта сайта Mafia One',
  },
  '/rules': {
    title: 'Правила сайта',
    description: 'На этой странице вы можете прочитать правила сайта Mafia One',
  },
  '/payments': {
    title: 'О платежах',
    description:
      'На этой странице вы можете почитать порядок проведения платежей на сайте Mafia One',
  },
  '/guidelines': {
    title: 'О нарушениях',
    description:
      'На этой странице вы можете почитать какие бывают нарушения и что за них грозит пользователю сайта Mafia One',
  },
  '/bans': {
    title: 'О наказаниях',
    description:
      'На этой странице можно почитать какие наказания применяются к нарушителям правил сайта Mafia One',
  },
  '/inventory': {
    title: 'Об инвенторе',
    description:
      'На этой странице можно почитать о том, какие предметы может собирать в инвентаре пользователь сайта Mafia One',
  },
  '/how-to-play': {
    title: 'Как тут играть',
    description:
      'На этой странице можно почитать о режимах, которые есть на сайте Mafia One',
  },
  '/ranks': {
    title: 'Ранги',
    description:
      'На этой странице можно почитать о системе рангов сайта Mafia One',
  },
  '/market': {
    title: 'Маркет онлайн игры Mafia One',
    description: 'Покупайте и продавайте вещи из своего арсенала',
  },
}

const paramsList = Object.keys(seoData['/'])

const getParam = (paramName, url) => {
  if (seoData[url]) {
    if (seoData[url][paramName]) {
      return seoData[url][paramName]
    }
  }
  return seoData['/'][paramName]
}

const seoMiddelware = (req, res, next) => {
  paramsList.map((param) => {
    res.locals[param] = getParam(param, req.originalUrl)
  })
  next()
}

module.exports = {
  seoMiddelware,
}
