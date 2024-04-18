const { createTransport } = require('nodemailer')

const transporter = createTransport({
  service: 'gmail',
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
})

const mail = async (email, theme, message, attachments) => {
  const msg = {
    from: 'Mafia One <noreply@mafia-one.com>',
    to: email,
    subject: theme,
    text: '',
    html: message,
  }

  if (attachments) msg.attachments = attachments

  const info = await transporter.sendMail(msg)
  return info
}

module.exports = {
  mail,
}
