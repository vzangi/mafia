'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'games',
      {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
        },
        accountId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'accounts',
            key: 'id',
          },
        },
        gametypeId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'gametypes',
            key: 'id',
          },
        },
        playersCount: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        waitingTime: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        description: {
          type: Sequelize.STRING,
        },
        status: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        deadline: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
        },
      },
      {
        initialAutoIncrement: 1000000,
      }
    )
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('games')
  },
}
