'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('thingtypes', [
      {
        name: 'Вещь',
        sort: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Пропуск',
        sort: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Подарочный набор',
        sort: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Кейс',
        sort: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Ключ',
        sort: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Значок',
        sort: 60,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('thingtypes', null, {})
  },
}
