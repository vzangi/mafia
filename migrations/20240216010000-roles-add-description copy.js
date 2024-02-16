'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('roles', 'description', {
      after: 'picture',
      type: Sequelize.TEXT,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('roles', 'description')
  },
}
