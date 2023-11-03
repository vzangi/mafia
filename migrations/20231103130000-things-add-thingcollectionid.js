'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('things', 'thingcollectionId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'thingcollections',
        key: 'id',
      },
      after: 'forsale',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('things', 'thingcollectionId')
  },
}
