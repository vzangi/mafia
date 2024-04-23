'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('games', 'firstday', {
      after: 'mode',
      type: Sequelize.BOOLEAN,
      defaultValue: true,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('games', 'firstday')
  },
}
