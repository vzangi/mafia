'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('accounts', 'gender', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      after: 'wallet',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('accounts', 'gender')
  },
}
