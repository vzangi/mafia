'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gamelifes', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      gameplayerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'gameplayers',
          key: 'id',
        },
      },
      type: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
      },
      life: {
        type: Sequelize.INTEGER,
        defaultValue: 100,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('gamelifes')
  },
}
