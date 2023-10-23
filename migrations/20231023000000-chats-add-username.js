'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('chats', 'username', {
      type: Sequelize.STRING,
      after: 'accountId',
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('chats', 'username')
  },
}
