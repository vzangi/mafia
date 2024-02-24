'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable(
			'punishments',
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
				type: {
					type: Sequelize.INTEGER,
					allowNull: false,
				},
				untilAt: {
					type: Sequelize.DATE,
					allowNull: false,
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
		await queryInterface.dropTable('punishments')
	},
}
