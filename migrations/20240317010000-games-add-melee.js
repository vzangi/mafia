'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
	async up(queryInterface, Sequelize) {
		await queryInterface.addColumn('games', 'melee', {
			after: 'mode',
			type: Sequelize.BOOLEAN,
			defaultValue: false,
		})
	},

	async down(queryInterface, Sequelize) {
		await queryInterface.removeColumn('games', 'melee')
	},
}
