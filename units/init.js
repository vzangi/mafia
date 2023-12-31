require('dotenv').config({ path: './.env' })
const express = require('express')
const app = express()
const http = require('http')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)
const sequelize = require('./db')
const cookieParser = require('cookie-parser')
const { validateToken } = require('./jwt')
const { userToTemplate } = require('../middlewares/AuthMiddleware')
const path = require('path')
const fileUpload = require('express-fileupload')
const bot = require('./bot')

// Папки со статическими файлами
app.use(express.static('public'))
app.use(express.static('node_modules/bootstrap/dist/'))

// Использую шаблонизатор pug
app.set('view engine', 'pug')

// Могу использовать json
app.use(express.json())

// Использую куки
app.use(cookieParser())

// Проверка наличия и валидности токена авторизации
app.use(validateToken)

// Добавляю пользователя в переменные шаблона, если он авторизован
app.use(userToTemplate)

// Добавляю поддержку загрузки файлов на сервер
app.use(fileUpload())

// Базовый каталог для шаблонов
app.locals.basedir = path.join(__dirname, '../views')

module.exports = {
  app,
  server,
  io,
  sequelize,
  bot,
}
