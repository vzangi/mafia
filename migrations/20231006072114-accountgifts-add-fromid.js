'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('accountgifts', 'fromId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'accounts',
        key: 'id',
      },
      after: 'accountId',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('accounts', 'gender')
  },
}
