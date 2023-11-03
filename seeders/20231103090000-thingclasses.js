'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('thingclasses', [
      {
        name: 'Обыкновенный',
        sort: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Стандартный',
        sort: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Особенный',
        sort: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Высочайший',
        sort: 40,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Эксклюзивный',
        sort: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('thingclasses', null, {})
  },
}
