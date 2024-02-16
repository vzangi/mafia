'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('rolesides', 'picture', {
      after: 'name',
      type: Sequelize.STRING,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('rolesides', 'picture')
  },
}
