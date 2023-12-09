const GamePlayer = require('../../../models/GamePlayer');
const Role = require('../../../models/Role');
const BaseService = require('../BaseService')

class ChatService extends BaseService {
  constructor(io, socket) {
    super(io, socket)

    const { user, gameId } = socket

    socket.join(gameId);

    if (user) {
      // Получаю информацию
      GamePlayer.findOne({
        where: {
          gameId,
          accountId: user.id,
          status: [
            GamePlayer.playerStatuses.IN_GAME,
            GamePlayer.playerStatuses.FREEZED,
          ]
        }
      }).then(gp => {
        if (gp) socket.player = true
      })
    }

  }

  async getRole() {
    const { user, gameId } = this.socket

    if (user) {
      const player = await GamePlayer.findOne({
        where: {
          gameId,
          accountId: user.id
        },
        include: [
          { model: Role }
        ]
      })

      if (player) {
        return {
          name: player.role.name,
          id: player.role.id
        }
      }
    }
    return {
      name: 'Зритель',
      id: 0
    }
  }
}

module.exports = ChatService
