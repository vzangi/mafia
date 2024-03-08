const { DataTypes, Sequelize, Op } = require('sequelize')
const sequelize = require('../units/db')
const Role = require('./Role')
const Account = require('./Account')

const playerStatuses = {
	WHAITNG: 0,
	LEAVE: 1,
	DROPPED: 2,
	IN_GAME: 3,
	KILLED: 4,
	PRISONED: 5,
	TIMEOUT: 6,
	FREEZED: 7,
	WON: 8,
}

const GamePlayer = sequelize.define(
	'gameplayers',
	{
		id: {
			type: DataTypes.INTEGER,
			autoIncrement: true,
			primaryKey: true,
		},
		gameId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		accountId: {
			type: DataTypes.INTEGER,
			allowNull: false,
		},
		username: {
			type: DataTypes.STRING,
		},
		status: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0,
		},
		roleId: {
			type: DataTypes.INTEGER,
		},
	},
	{
		scopes: {
			ingame(gameId) {
				return {
					where: {
						gameId,
						status: [
							playerStatuses.WHAITNG,
							playerStatuses.IN_GAME,
							playerStatuses.KILLED,
							playerStatuses.PRISONED,
							playerStatuses.TIMEOUT,
							playerStatuses.FREEZED,
							playerStatuses.WON,
						],
					},
					attributes: ['id', 'status', 'username', 'accountId', 'roleId'],
					include: [
						{
							model: Account,
							attributes: [
								'online',
								'avatar',
								'gender',
								'telegramChatId',
								'rank',
							],
						},
						{
							model: Role,
						},
					],
				}
			},
		},
	}
)

GamePlayer.playerStatuses = playerStatuses

/**
 * Расчёт балла ранга полученного по результатам игры
 */
GamePlayer.getGameRank = async (game) => {
	const reqAvg = {
		where: {
			gameId: game.id,
		},
		include: [
			{
				model: Role,
				attributes: [],
			},
			{
				model: Account,
				attributes: [],
			},
		],
		raw: true,
		attributes: [[Sequelize.fn('AVG', Sequelize.col('rank')), 'avg']],
	}

	// Средний ранг игроков
	const allAvg = await GamePlayer.findOne(reqAvg)

	reqAvg.include[0].where = {
		rolesideId: game.rolesideId,
	}

	// Средний ранг победителей
	const winAvg = await GamePlayer.findOne(reqAvg)

	reqAvg.include[0].where = {
		rolesideId: { [Op.ne]: game.rolesideId },
	}

	// Средний ранг проигравших
	const looseAvg = await GamePlayer.findOne(reqAvg)

	// Балл
	const bal = Math.round(
		15 - (5 * ((winAvg.avg - looseAvg.avg) * 100)) / allAvg.avg / 100
	)

	if (bal < 1) return 1
	return bal
}

GamePlayer.belongsTo(Role)
Account.hasMany(GamePlayer)

module.exports = GamePlayer
