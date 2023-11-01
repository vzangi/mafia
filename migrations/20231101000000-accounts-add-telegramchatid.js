'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('accounts', 'telegramChatId', {
      type: Sequelize.STRING,
      after: 'role',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('accounts', 'telegramChatId')
  },
}
