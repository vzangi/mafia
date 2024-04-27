'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('messages', 'privatechatId', {
			after: 'friendId',
			type: Sequelize.INTEGER,
			allowNull: true,
			references: {
				model: 'privatechats',
				key: 'id',
			},
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('messages', 'privatechatId')
	},
}
