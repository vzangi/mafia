const { DataTypes, Sequelize } = require('sequelize')
const sequelize = require('../units/db')
const findNikLimit = 10

const Account = sequelize.define(
    'account',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        status: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        avatar: {
            type: DataTypes.STRING,
            defaultValue: 'noname.svg'
        },
        rank: {
            type: DataTypes.INTEGER,
            defaultValue: 1500
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        online: {
            type: DataTypes.BOOLEAN,
            defaultValue: 0
        },
        vipTo: {
            type: DataTypes.DATE
        },
        vip: {
            type: DataTypes.VIRTUAL(DataTypes.INTEGER),
            get() {
                if (!this.vipTo) return 0
                const now = new Date()
                // console.log(now, this.vipTo.toISOString())
                if (this.vipTo > now) return 1
                return 0
            },
            set() {
                throw new Error('Do not try to set the `vip` value!');
            }
        }
    }
)

// Функция поиска игроков по нику
Account.findAccountsByNik = async (nik) => {
    const accounts = await Account.findAll({
        where: {
            username: {
                [Sequelize.Op.substring]: nik
            }
        },
        attributes: ['id', 'username', 'online', 'avatar', 'vipTo', 'vip'],
        limit: findNikLimit
    })
    return accounts
}

module.exports = Account