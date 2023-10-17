class Gifts {
  gift(req, res) {
    const { to } = req.query

    res.render('pages/gift', { to })
  }
}

module.exports = new Gifts()
