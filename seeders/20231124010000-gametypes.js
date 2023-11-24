'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('gametypes', [
      {
        name: 'Классический',
      },
      {
        name: 'Перестрелка',
      },
      {
        name: 'Соревновательный',
      },
      {
        name: 'Мультиролевой',
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('gametypes', null, {})
  },
}
