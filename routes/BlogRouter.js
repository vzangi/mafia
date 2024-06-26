const express = require('express')
const router = express.Router()
const pages = [
  'bans',
  'guidelines',
  'how-to-play',
  'payments',
  'ranks',
  'rules',
  'vip',
  'roles',
  'classic',
  'shootout',
  'multimode',
  'constructor',
  'competitive',
]

pages.map((page) => {
  router.get(`/${page}`, (req, res) => {
    res.render(`pages/blog/${page}`)
  })
})

module.exports = router
