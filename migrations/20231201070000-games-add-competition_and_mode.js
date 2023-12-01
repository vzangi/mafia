'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // true - соревновательный режим
    // false - обычный
    await queryInterface.addColumn('games', 'competition', {
      after: 'deadline',
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    })
    // 1 - режим по большинству голосов
    // 2 - режим по количеству голосов
    await queryInterface.addColumn('games', 'mode', {
      after: 'deadline',
      type: Sequelize.INTEGER,
      defaultValue: 1,
    })
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('games', 'mode')
    await queryInterface.removeColumn('games', 'competition')
  },
}
