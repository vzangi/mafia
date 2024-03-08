'use strict'
/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable(
			'accounts',
			{
				id: {
					allowNull: false,
					autoIncrement: true,
					primaryKey: true,
					type: Sequelize.INTEGER,
				},
				username: {
					type: Sequelize.STRING,
					unique: true,
					allowNull: false,
				},
				email: {
					type: Sequelize.STRING,
					unique: true,
					allowNull: false,
				},
				password: {
					type: Sequelize.STRING,
					allowNull: false,
				},
				avatar: {
					type: Sequelize.STRING,
				},
				status: {
					type: Sequelize.INTEGER,
					defaultValue: 0,
				},
				level: {
					type: Sequelize.INTEGER,
					defaultValue: 0,
				},
				rank: {
					type: Sequelize.INTEGER,
					defaultValue: 2000,
				},
				online: {
					type: Sequelize.BOOLEAN,
					defaultValue: 0,
				},
				vipTo: {
					type: Sequelize.DATE,
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
		await queryInterface.dropTable('accounts')
	},
}
