'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable(
			'claims',
			{
				id: {
					allowNull: false,
					autoIncrement: true,
					primaryKey: true,
					type: Sequelize.INTEGER,
				},
				accountId: {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: {
						model: 'accounts',
						key: 'id',
					},
				},
				playerId: {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: {
						model: 'accounts',
						key: 'id',
					},
				},
				type: {
					type: Sequelize.INTEGER,
					allowNull: false,
				},
				gameId: {
					type: Sequelize.INTEGER,
					references: {
						model: 'games',
						key: 'id',
					},
				},
				punishmentId: {
					type: Sequelize.INTEGER,
					references: {
						model: 'punishments',
						key: 'id',
					},
					onDelete: 'CASCADE',
					onUpdate: 'NO ACTION',
				},
				comment: {
					type: Sequelize.STRING,
				},
				createdAt: {
					allowNull: false,
					type: Sequelize.DATE,
				},
				updatedAt: {
					allowNull: false,
					type: Sequelize.DATE,
				},
			},
			{
				charset: 'utf8mb4',
				collate: 'utf8mb4_general_ci',
			}
		)
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.dropTable('claims')
	},
}
