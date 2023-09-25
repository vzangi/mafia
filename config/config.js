module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mafia_migrations',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || '3306',
    dialect: process.env.DB_TYPE || 'mysql',
    migrationStorageTableName: process.env.MIGRATION_TABLE || 'migrations',
  },
  test: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mafia_migrations',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || '3306',
    dialect: process.env.DB_TYPE || 'mysql',
    migrationStorageTableName: process.env.MIGRATION_TABLE || 'migrations',
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mafia_migrations',
    host: process.env.DB_HOST || '127.0.0.1',
    port: process.env.DB_PORT || '3306',
    dialect: process.env.DB_TYPE || 'mysql',
    migrationStorageTableName: process.env.MIGRATION_TABLE || 'migrations',
  },
}
