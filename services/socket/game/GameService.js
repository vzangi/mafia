const Account = require('../../../models/Account');
const GameChat = require('../../../models/GameChat');
const GameChatUsers = require('../../../models/GameChatUsers');
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

  async getMessages() {
    const { socket, user } = this
    const { gameId } = socket

    const messages = await GameChat.findAll({
      where: {
        gameId,
        private: false,
      },
      attributes: ['message', 'private', 'createdAt', 'username'],
      include: [
        {
          model: Account,
          attributes: ['username'],
          required: false
        },
        {
          model: GameChatUsers,
          include: [
            {
              model: Account,
              attributes: ['username']
            }
          ]
        }
      ],
    })

    if (user) {
      const privateMessages = []
    }

    return messages
  }

  // Пришло сообщение
  async message(message, isPrivate = false) {
    const { user, io, socket } = this
    const { gameId } = socket
    if (!user) {
      throw new Error('Не авторизован')
    }

    // Сохраняю сообщение в базу
    const msg = await GameChat.newMessage(gameId, user.id, message, isPrivate)

    if (!isPrivate) {
      // Рассылаю сообщение всем подключенным пользователям
      io.of('/game').to(gameId).emit('message', msg)
    } else {
      console.log(msg.gamechatusers);
    }
  }
}

module.exports = ChatService
