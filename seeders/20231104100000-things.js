'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('things', [
      {
        name: 'VIP на неделю',
        description: 'Этот пропуск можно активировать, продлив свой VIP-статус на одну неделю.',
        picture: 'vip-week.svg',
        price: 10,
        forsale: 1,
        thingtypeId: 2,
        thingclassId: 2,
        thingcollectionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'VIP на месяц',
        description: 'Этот пропуск можно активировать, продлив свой VIP-статус на один месяц.',
        picture: 'vip-month.svg',
        price: 40,
        forsale: 1,
        thingtypeId: 2,
        thingclassId: 2,
        thingcollectionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Балисонг',
        description: "Этот предмет увеличивает силу нападения на 5%. Балисонг или нож-бабочка — складной нож с клинком, скрываемым в сложенном положении в рукояти, образованной двумя продольными половинами с П-образным сечением, шарнирно соединёнными с хвостовиком клинка. При открывании половины рукояти совершают оборот на 180 градусов в противоположные направления относительно клинка, обнажая клинок и, соединяясь, образуют рукоять.",
        picture: '0001.png',
        price: 1,
        forsale: 1,
        thingtypeId: 1,
        thingclassId: 1,
        thingcollectionId: 2,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ])
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('things', null, {})
  },
}
