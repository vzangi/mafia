const Sequelize = require('sequelize')
const sequelize = new Sequelize(
  process.env.DB_NAME || 'mafia',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    dialect: process.env.DB_TYPE || 'mysql',
    timezone: '+00:00',
    logging: false,
    define: {
      charset: 'utf8mb4',
      collate: 'utf8mb4_unicode_ci',
      timestamps: true,
    },
  }
)

module.exports = sequelize
