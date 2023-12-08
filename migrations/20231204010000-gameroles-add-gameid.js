'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('gameroles', 'gameId', {
      after: 'id',
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'games',
        key: 'id',
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('gameroles', 'gameId')
  },
}
