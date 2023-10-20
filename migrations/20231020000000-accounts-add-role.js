'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('accounts', 'role', {
      type: Sequelize.INTEGER,
      allowNull: false,
      after: 'status',
      defaultValue: 0,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('accounts', 'role')
  },
}
