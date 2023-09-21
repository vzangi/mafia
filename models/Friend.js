const { DataTypes, Op } = require('sequelize')
const sequelize = require('../units/db')
const Account = require('./Account')

const friendshipStatuses = {
    BLOCK: -2,
    DECLINE: -1,
    REQUESTED: 0,
    ACCEPTED: 1,
    MARRIED_REQUEST: 2,
    MARRIED: 3
}

const Friend = sequelize.define(
    'friends',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        accountId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        friendId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
    },
    {
        scopes: {
            def: {
                include: [{
                    model: Account,
                    as: 'friend'
                }],
            },
            // Запросы на дружбу/партнёрство
            requests(userId) {
                return {
                    where: {
                        friendId: userId,
                        [Op.or]: [
                            { status: friendshipStatuses.REQUESTED },
                            { status: friendshipStatuses.MARRIED_REQUEST }
                        ]
                    }
                }
            }
        }
    }
)

Friend.belongsTo(Account, { as: 'account', foreignKey: 'accountId' })
Friend.belongsTo(Account, { as: 'friend', foreignKey: 'friendId' })

Friend.statuses = friendshipStatuses

Friend.requestsCount = async (friendId) => {
    return await Friend.scope({ method: ['requests', friendId] }).count() 
}

module.exports = Friend