'use strict';
/**
 * emailService.js
 * Nodemailer email utility for OTP delivery.
 * purpose: 'login' | 'reset' (default: 'reset')
 */

const nodemailer = require('nodemailer');

let _transporter = null;

const getTransporter = async () => {
  if (_transporter) return _transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  } else {
    const testAccount = await nodemailer.createTestAccount();
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email', port: 587, secure: false,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('📧 Ethereal test email account:', testAccount.user);
  }

  return _transporter;
};

const sendOtpEmail = async (to, name, otp, portal = 'CarePlus', purpose = 'reset') => {
  const transporter = await getTransporter();

  const isLogin = purpose === 'login';
  const subject = isLogin
    ? `[CarePlus] Sign-In OTP – ${portal}`
    : `[CarePlus] Password Reset OTP – ${portal}`;
  const actionText = isLogin
    ? `We received a sign-in request for your <strong>${portal}</strong> account. Use the OTP below to complete your login.`
    : `We received a request to reset the password for your <strong>${portal}</strong> account.`;
  const tagLabel = isLogin ? `${portal} – Sign In` : `${portal} – Password Reset`;

  const info = await transporter.sendMail({
    from: `"CarePlus HMS" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@careplus.com'}>`,
    to,
    subject,
    html: `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
  body{margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f9;}
  .wrapper{max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
  .header{background:linear-gradient(135deg,#0F9B8E,#12B3A7);padding:32px 40px;text-align:center;}
  .header h1{margin:0;color:#fff;font-size:26px;font-weight:700;}
  .body{padding:36px 40px;}
  .otp-box{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px dashed #0F9B8E;border-radius:14px;text-align:center;padding:24px 20px;margin:20px 0;}
  .otp-code{font-size:44px;font-weight:900;color:#0F9B8E;letter-spacing:12px;font-family:'Courier New',monospace;}
  .warning{background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:14px 18px;margin:20px 0;}
  .warning p{margin:0;font-size:13px;color:#92400e;}
  .footer{background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;}
  .footer p{margin:0;font-size:12px;color:#94a3b8;}
  .portal-tag{display:inline-block;background:#0F9B8E;color:#fff;font-size:10px;font-weight:700;padding:3px 10px;border-radius:100px;text-transform:uppercase;margin-bottom:8px;}
</style></head>
<body><div class="wrapper">
  <div class="header"><h1>⚕️ CarePlus HMS</h1></div>
  <div class="body">
    <div class="portal-tag">${tagLabel}</div>
    <p style="font-size:17px;color:#1e293b;font-weight:600;">Hello, ${name}!</p>
    <p style="font-size:14px;color:#475569;">${actionText}</p>
    <div class="otp-box">
      <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Your One-Time Password</div>
      <div class="otp-code">${otp}</div>
      <div style="font-size:12px;color:#94a3b8;margin-top:10px;">⏱ Expires in <strong>10 minutes</strong></div>
    </div>
    <div class="warning"><p>🔒 <strong>Security Notice:</strong> If you did not request this, contact your IT administrator immediately.</p></div>
  </div>
  <div class="footer"><p>© ${new Date().getFullYear()} CarePlus Healthcare Systems. All rights reserved.</p></div>
</div></body></html>`,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`📧 OTP email preview: ${nodemailer.getTestMessageUrl(info)}`);
  }

  return info;
};

const sendCallPatientEmail = async (to, name, tokenNumber, doctorName, department) => {
  const transporter = await getTransporter();
  const subject = `[CarePlus] Your Turn: Call for Token #${tokenNumber}`;
  const info = await transporter.sendMail({
    from: `"CarePlus HMS" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@careplus.com'}>`,
    to,
    subject,
    html: `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<style>
  body{margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f4f6f9;}
  .wrapper{max-width:580px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
  .header{background:linear-gradient(135deg,#0F9B8E,#12B3A7);padding:32px 40px;text-align:center;}
  .header h1{margin:0;color:#fff;font-size:26px;font-weight:700;}
  .body{padding:36px 40px;}
  .info-box{background:linear-gradient(135deg,#f0fdf4,#ecfdf5);border:2px dashed #0F9B8E;border-radius:14px;text-align:center;padding:24px 20px;margin:20px 0;}
  .token-no{font-size:44px;font-weight:900;color:#0F9B8E;}
  .footer{background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;text-align:center;}
  .footer p{margin:0;font-size:12px;color:#94a3b8;}
</style></head>
<body><div class="wrapper">
  <div class="header"><h1>⚕️ CarePlus HMS</h1></div>
  <div class="body">
    <p style="font-size:17px;color:#1e293b;font-weight:600;">Hello, ${name}!</p>
    <p style="font-size:14px;color:#475569;">It is your turn for consultation. Please proceed to the vitals entry counter or consultation room.</p>
    <div class="info-box">
      <div style="font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:10px;">Your Token Number</div>
      <div class="token-no">Token #${tokenNumber}</div>
      <div style="font-size:14px;color:#475569;margin-top:10px;">Doctor: <strong>Dr. ${doctorName}</strong> (${department})</div>
    </div>
    <p style="font-size:13px;color:#475569;">Please make sure you are available outside the consultation room.</p>
  </div>
  <div class="footer"><p>© ${new Date().getFullYear()} CarePlus Healthcare Systems. All rights reserved.</p></div>
</div></body></html>`,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`📧 Call Patient email preview: ${nodemailer.getTestMessageUrl(info)}`);
  }

  return info;
};

module.exports = { sendOtpEmail, sendCallPatientEmail };
