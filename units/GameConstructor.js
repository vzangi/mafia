const GameInitRole = require('../models/GameInitRole')
const GameMulti = require('./GameMulti')

// Игра в классическом режиме
class GameConstructor extends GameMulti {
  // Получаю доступные роли
  async getAvailableRoles() {
    const { game } = this

    const initroles = await GameInitRole.findAll({ where: { gameId: game.id } })

    const roles = []

    for (const index in initroles) {
      const role = initroles[index]
      roles.push([role.roleId, role.cnt])
    }

    return roles
  }
}

module.exports = GameConstructor
