'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('rolesides', [
      {
        name: 'Ничья',
      },
      {
        name: 'Честные',
      },
      {
        name: 'Мафия',
      },
      {
        name: 'Маньяк',
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('rolesides', null, {})
  },
}
