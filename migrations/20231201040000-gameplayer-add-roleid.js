'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('gameplayers', 'roleId', {
      after: 'status',
      type: Sequelize.INTEGER,
      references: {
        model: 'roles',
        key: 'id',
      },
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('gameplayers', 'roleId')
  },
}
