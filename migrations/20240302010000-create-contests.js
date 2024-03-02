'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable(
			'contests',
			{
				id: {
					allowNull: false,
					autoIncrement: true,
					primaryKey: true,
					type: Sequelize.INTEGER,
				},
				name: {
					type: Sequelize.STRING,
				},
				gametypeId: {
					type: Sequelize.INTEGER,
					allowNull: false,
					references: {
						model: 'gametypes',
						key: 'id',
					},
				},
				playersCount: {
					type: Sequelize.INTEGER,
					allowNull: false,
				},
				mode: {
					type: Sequelize.INTEGER,
					defaultValue: 1,
				},
				active: {
					type: Sequelize.BOOLEAN,
					defaultValue: true,
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
		await queryInterface.dropTable('contests')
	},
}
