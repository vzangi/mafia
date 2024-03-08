'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('gameevents', {
			id: {
				allowNull: false,
				autoIncrement: true,
				primaryKey: true,
				type: Sequelize.INTEGER,
			},
			gameId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'games',
					key: 'id',
				},
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
			},
			value: {
				type: Sequelize.INTEGER,
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
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.dropTable('gameevents')
	},
}
