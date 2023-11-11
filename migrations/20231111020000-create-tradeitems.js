'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('tradeitems', {
      id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      tradeId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'trades',
          key: 'id',
        },
      },
      accountthingId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'accountthings',
          key: 'id',
        },
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tradeitems')
  },
}
