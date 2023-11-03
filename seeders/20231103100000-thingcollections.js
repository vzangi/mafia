'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('thingcollections', [
      {
        name: 'Коллекция «Bandit»',
        sort: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Коллекция «Citizen»',
        sort: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Коллекция «Sheriff»',
        sort: 30,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('thingcollections', null, {})
  },
}
