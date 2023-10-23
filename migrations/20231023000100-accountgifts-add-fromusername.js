'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('accountgifts', 'fromusername', {
      type: Sequelize.STRING,
      after: 'fromId',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('accountgifts', 'fromusername')
  },
}
