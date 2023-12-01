'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('games', 'rolesideId', {
      after: 'deadline',
      type: Sequelize.INTEGER,
      references: {
        model: 'rolesides',
        key: 'id',
      },
    })
    await queryInterface.addColumn('games', 'day', {
      after: 'deadline',
      type: Sequelize.INTEGER,
    })
    await queryInterface.addColumn('games', 'startedAt', {
      after: 'deadline',
      type: Sequelize.DATE,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('games', 'startedAt')
    await queryInterface.removeColumn('games', 'day')
    await queryInterface.removeColumn('games', 'rolesideId')
  },
}
