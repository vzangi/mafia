'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('accounts', 'wallet', {
      type: Sequelize.FLOAT,
      defaultValue: 0,
      after: 'avatar',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('accounts', 'wallet')
  },
}
