const nodemailer = require('nodemailer');
const config = require('config');

const mailText = 'We heard you lost your password :(, but here is a new one!: ';

function sendMail(request, response, newPassword) {
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

  const mailOptions = {
    from: 'hypechat.team@gmail.com',
    to: request.body.email,
    subject: 'HypeChat password restoration',
    text: mailText + newPassword
  };

  transporter.sendMail(mailOptions, function(error, info) {
    return error;
  });
};

exports.sendMail = sendMail;
