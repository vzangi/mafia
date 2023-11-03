'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('things', 'thingtypeId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'thingtypes',
        key: 'id',
      },
      after: 'forsale',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('things', 'thingtypeId')
  },
}
