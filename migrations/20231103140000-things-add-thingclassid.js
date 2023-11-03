'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('things', 'thingclassId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'thingclasses',
        key: 'id',
      },
      after: 'forsale',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('things', 'thingclassId')
  },
}
