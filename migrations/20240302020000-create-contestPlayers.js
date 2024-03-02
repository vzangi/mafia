'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('contestplayers', {
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
			contestId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'contests',
					key: 'id',
				},
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
		await queryInterface.dropTable('contestplayers')
	},
}
