'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('gamechatusers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      accountId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'accounts',
          key: 'id',
        },
      },
      gamechatId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'gamechats',
          key: 'id',
        },
        onDelete: 'cascade',
        onUpdate: 'restrict',
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('gamechatusers')
  },
}
