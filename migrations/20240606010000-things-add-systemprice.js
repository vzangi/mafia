'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('things', 'systemPrice', {
      after: 'price',
      type: Sequelize.FLOAT,
      defaultValue: 0,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('things', 'systemPrice')
  },
}
