'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.createTable('privatechats', {
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
			friendId: {
				type: Sequelize.INTEGER,
				allowNull: false,
				references: {
					model: 'accounts',
					key: 'id',
				},
			},
			active: {
				type: Sequelize.INTEGER,
				defaultValue: 1,
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
		await queryInterface.dropTable('privatechats')
	},
}
