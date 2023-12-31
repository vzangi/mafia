const express = require('express')
const router = express.Router()
const pages = [
  'bans',
  'guidelines',
  'how-to-play',
  'inventory',
  'payments',
  'ranks',
  'rules',
]

pages.map((page) => {
  router.get(`/${page}`, (req, res) => {
    res.render(`pages/blog/${page}`)
  })
})

module.exports = router
