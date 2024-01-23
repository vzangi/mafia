'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'gamelogs',
      {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        gameId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'games',
            key: 'id',
          },
        },
        message: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        hidden: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        type: {
          type: Sequelize.INTEGER,
          defaultValue: 1,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      },
      {
        charset: 'utf8mb4',
        collate: 'utf8mb4_general_ci',
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('gamelogs')
  },
}
