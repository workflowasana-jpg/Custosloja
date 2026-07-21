// lib/email.js
// Substitui o MailApp.sendEmail() do Google Apps Script.
// Usa Gmail (ou qualquer SMTP) via nodemailer — sem precisar de conta
// em serviço de e-mail transacional de terceiros.

const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    throw new Error(
      'Variáveis de ambiente ausentes: GMAIL_USER, GMAIL_APP_PASSWORD.'
    );
  }

  _transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  });

  return _transporter;
}

async function enviarEmail({ to, subject, htmlBody }) {
  const transporter = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.GMAIL_USER;

  await transporter.sendMail({
    from,
    to,
    subject,
    html: htmlBody,
  });
}

module.exports = { enviarEmail };
