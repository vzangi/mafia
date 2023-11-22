'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('accountthings', 'taked', {
      type: Sequelize.BOOLEAN,
      after: 'marketPrice',
      defaultValue: false,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('things', 'thingtypeId')
  },
}
