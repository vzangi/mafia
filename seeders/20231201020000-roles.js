'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('roles', [
      {
        name: 'Честный житель',
        rolesideId: 2,
      },
      {
        name: 'Мафия',
        rolesideId: 3,
      },
      {
        name: 'Комиссар',
        rolesideId: 2,
      },
      {
        name: 'Сержант',
        rolesideId: 2,
      },
      {
        name: 'Врач',
        rolesideId: 2,
      },
      {
        name: 'Маньяк',
        rolesideId: 4,
      },
      {
        name: 'Дитя',
        rolesideId: 2,
      },
      {
        name: 'Адвокат',
        rolesideId: 3,
      },
      {
        name: 'Любовница',
        rolesideId: 3,
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('roles', null, {})
  },
}
