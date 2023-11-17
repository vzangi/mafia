'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('naborthings', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      naborId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'things',
          key: 'id',
        },
      },
      thingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'things',
          key: 'id',
        },
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('naborthings')
  },
}
