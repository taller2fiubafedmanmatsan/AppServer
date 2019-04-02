const nodemailer = require('nodemailer');
const config = require('config');

const mailText = 'We heard you lost your password :(, but here is a new one!: ';

const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'hypechat.team@gmail.com',
    pass: config.get('mail_service_pwd')
  },
  tls: {
    rejectUnauthorized: false
  }
});

function sendMail(receiver, newPassword) {
  const mailOptions = {
    from: 'hypechat.team@gmail.com',
    to: receiver,
    subject: 'HypeChat password restoration',
    text: mailText + newPassword
  };

  transporter.sendMail(mailOptions, (error) =>{
    return error;
  });
};

exports.sendMail = sendMail;
