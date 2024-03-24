const seoData = {
	'/': {
		title: 'Мафия — Браузерная онлайн игра',
		description:
			'Приглашаем в бесплатную онлайн игру — мафию. Это отличное место, чтобы поиграть с друзьями в легендарную игру. Выбирайте различные режимы игр, собирайте редкие коллекции игровых предметов, общайтесь, веселитесь!',
		ogimage: process.env.APP_HOST + '/images/logo.jpg',
	},
	'/login': {
		title: 'Вход на сайт Mafia One',
		description: 'На этой странице вы можете ввести данные для авторизации',
	},
	'/lobbi': {
		title: 'Лобби онлайн игры Мафия с общим чатом',
		description:
			'Общайтесь онлайн со своими друзьями, создавайте заявки в различных режимах и играйте в мафию бесплатно. Участвуйте в соревновании, чтобы иметь возможность выиграть призы и получить бурю незабываемых эмоций!',
	},
	'/registration': {
		title: 'Регистрация на сайте Mafia One',
		description:
			'На этой странице вы можете зарегистрироваться на сайте Mafia One',
	},
	'/restore': {
		title: 'Восстановление пароля на сайте Mafia One',
		description:
			'На этой странице вы можете указать почтовый ящик для восстановления забытого пароля от аккаунта сайта Mafia One',
	},
	'/rules': {
		title: 'Правила онлайн игры Мафия',
		description:
			'Как и всякая онлайн игра, мафия имеет свои правила, поэтому настоятельно просим Вас ознакомиться с тем, что можно и нельзя делать на нашем проекте.',
	},
	'/payments': {
		title: 'Информация о платежах на сайте онлайн игры Мафия',
		description:
			'Несмотря на то, что онлайн игра мафия является бесплатной, администрация сайта Mafia One предоставляет пользователям право проводить платежи в пользу сайта. Платежи являются добровольными и необязательными и позволяют игрокам приобретать различные вещи на маркете.',
	},
	'/guidelines': {
		title:
			'Информация о возможных нарушениях правил честной игры онлайн игры Мафия',
		description:
			'Эти правила были разработаны для поддержания здоровой и дружелюбной атмосферы в онлайн игре мафия. Они не являются ни документом, ни исчерпывающим описанием действий, которые не одобряются сообществом и администрацией сайта Mafia One и применяются лишь в рамках их адекватного понимания.',
	},
	'/bans': {
		title:
			'Информация о наказаниях применяемых к нарушителям правил онлайн игры Мафия',
		description:
			'Здесь мы в подробностях расскажем о деталях наказаний, которые мы накладываем на игроков, нарушающих правила бесплатной онлайн игры Mafia One.',
	},
	'/inventory': {
		title: 'Информаия об инвенторе персонажей онлайн игры Мафия',
		description:
			'Инвентарь — раздел сайта, где хранятся игровые предметы персонажа. Их можно продавать на маркете, обмениваться ими с другими игроками и использовать в специально разработанном режиме игры — перестрелке.',
	},
	'/how-to-play': {
		title: 'Как играть в онлайн версию мафии?',
		description:
			'У нас вы сможете сыграть в различные версии мафии, отличающиеся как наличием разнообразных ролей, так и механикой самой игры. Наша версия игры немного отличается от классической. Где-то мы добавили новое, где-то исправили то, что посчитали нужным доработать.',
	},
	'/ranks': {
		title: 'Информация о системе рангов персонажей онлайн игры Мафия',
		description:
			'Система рангов онлайн игры мафия создана, чтобы определять уровень игрока и подбирать примерно равных соперников, чтобы игра была интереснее. Система рангов работает только в соревновательном режиме, но не ограничивается его использованием.',
	},
	'/market': {
		title: 'Маркет онлайн игры Мафия',
		description:
			'Покупайте и продавайте вещи из своего арсенала. Здесь вы можете приобрести vip-пропуска, вещи для игры в режиме перестрелки, подарочные наборы, значки и многое другое.',
	},
	'/market/my': {
		title: 'Мои лоты на маркете онлайн игры Мафия',
		description:
			'Управляйте лотами, которые вы выставили на маркет онлайн игры Mafia One.',
	},
	'/online': {
		title: 'Список игроков онлайн игры Мафия находящихся на сайте',
		description:
			'На этой странице онлайн игры мафия вы можете посмотреть список игроков, которые в данный момент находятся на сайте Mafia One.',
	},
	'/gift': {
		title: 'Дарите памятные открытки игрокам онлайн игры Мафия',
		description:
			'На этой странице онлайн игры мафия вы можете выбрать одну из тысячи великолепных открыток различных тематик, чтобы подарить её на память другу или подруге.',
	},
	'/vip': {
		title: 'Информация о VIP статусе онлайн игры Мафия',
		description:
			'На этой странице вы можете узнать какие преимущества даёт VIP статус по сравнению с возможностями обычных игроков онлайн игры мафия.',
	},
	'/roles': {
		title: 'Информация о доступных ролях онлайн игры Мафия',
		description:
			'На этой странице представлен список ролей, которые могут попадаться игрокам онлайн игры мафия. Некоторые роли доступны во всех режимах игры, а некоторые только в определённых.',
	},
	'/top-of-week': {
		title: 'Топ лучших игроков недели онлайн игры мафия',
		description:
			'В топ попадают игроки, которые на текущей неделе выиграли хотя бы один матч в соревновательном режиме. Каждый понедельник в 3:00 по Москве выдаются призы победителям топа, а сам топ очищается.',
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
	const url = req.originalUrl
	paramsList.map((param) => {
		res.locals[param] = getParam(param, url)
	})
	res.locals['url'] = url
	next()
}

module.exports = {
	seoMiddelware,
}
