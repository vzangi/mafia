const { createTransport } = require('nodemailer')

const transporter = createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  secure: true,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASSWORD,
  },
})

// const gmailTransporter = createTransport({
//   service: 'gmail',
//   auth: {
//     user: process.env.GMAIL_USER,
//     pass: process.env.GMAIL_PASSWORD,
//   },
// })

const mail = async (email, theme, message, attachments) => {
  const msg = {
    from: 'Mafia One <notify@mafia-one.com>',
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
