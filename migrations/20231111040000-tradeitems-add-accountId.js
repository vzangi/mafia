'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('tradeitems', 'accountId', {
      type: Sequelize.INTEGER,
      references: {
        model: 'accounts',
        key: 'id',
      },
      after: 'accountthingId',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tradeitems', 'accountId')
  },
}
