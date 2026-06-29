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

const sendWelcomeEmail = async ({
  to, hospitalName, hospitalCode, adminEmail, adminPassword,
  plan, billingCycle, amount, transactionId, planExpiresAt, loginUrl
}) => {
  const transporter = await getTransporter();

  const planLabels = { basic: 'Starter', standard: 'Professional', premium: 'Premium', enterprise: 'Enterprise' };
  const planLabel = planLabels[plan] || plan;
  const expiryStr = planExpiresAt
    ? new Date(planExpiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';
  const amountFormatted = `₹${Number(amount).toLocaleString('en-IN')}`;
  const cycleLabel = billingCycle === 'yearly' ? 'Annual' : 'Monthly';
  const dashboardUrl = loginUrl || 'https://health-dashboards-hospital-admin-fr.vercel.app';

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f0f4f8;color:#1e293b;}
  .wrapper{max-width:620px;margin:36px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);}
  .header{background:linear-gradient(135deg,#0B1F3A 0%,#0F9D8A 100%);padding:38px 40px 32px;text-align:center;}
  .logo{font-size:30px;font-weight:900;color:#fff;letter-spacing:-1px;}
  .logo span{color:#5EEAD4;}
  .header-sub{margin-top:6px;color:rgba(255,255,255,0.70);font-size:13px;}
  .success-badge{display:inline-block;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.25);border-radius:100px;padding:6px 18px;margin-top:16px;color:#fff;font-size:11px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;}
  .body{padding:36px 40px;}
  .greeting{font-size:19px;font-weight:700;color:#0B1F3A;margin-bottom:8px;}
  .intro{font-size:14px;color:#475569;line-height:1.75;margin-bottom:28px;}
  .section-title{font-size:10px;font-weight:800;color:#0F9D8A;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:12px;margin-top:24px;}
  .info-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:20px 24px;margin-bottom:20px;}
  .info-row{display:flex;justify-content:space-between;align-items:flex-start;padding:9px 0;border-bottom:1px solid #f1f5f9;}
  .info-row:last-child{border-bottom:none;}
  .info-label{font-size:12px;color:#64748b;font-weight:600;}
  .info-value{font-size:13px;color:#1e293b;font-weight:700;text-align:right;max-width:60%;}
  .cred-card{background:linear-gradient(135deg,#f0fdf9,#e0f2fe);border:2px solid #0F9D8A;border-radius:16px;padding:24px;margin-bottom:20px;}
  .cred-row{background:#fff;border-radius:10px;padding:12px 16px;margin-bottom:10px;border:1px solid #e2e8f0;}
  .cred-row:last-child{margin-bottom:0;}
  .cred-field{font-size:10px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;margin-bottom:5px;}
  .cred-val{font-size:14px;font-weight:700;color:#0F9D8A;font-family:'Courier New',monospace;word-break:break-all;}
  .alert-box{background:#fffbeb;border:1px solid #fde68a;border-radius:12px;padding:16px 20px;margin-bottom:24px;}
  .alert-box p{font-size:13px;color:#92400e;line-height:1.65;}
  .cta-btn{display:block;padding:16px;background:linear-gradient(135deg,#0F9D8A,#0B7A70);color:#fff !important;text-align:center;text-decoration:none;border-radius:12px;font-size:15px;font-weight:800;margin-bottom:24px;}
  .txn-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;text-align:center;margin-bottom:8px;}
  .txn-label{font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;letter-spacing:0.08em;}
  .txn-id{font-size:13px;color:#334155;font-family:'Courier New',monospace;font-weight:700;margin-top:5px;}
  .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;}
  .footer p{font-size:11px;color:#94a3b8;line-height:1.9;}
</style></head>
<body><div class="wrapper">
  <div class="header">
    <div class="logo">Care<span>Plus</span> HMS</div>
    <div class="header-sub">Hospital Management System — SaaS Platform</div>
    <div class="success-badge">✅ Registration Successful</div>
  </div>
  <div class="body">
    <p class="greeting">Welcome to CarePlus, ${hospitalName}! 🎉</p>
    <p class="intro">Your hospital has been successfully onboarded onto the CarePlus HMS platform. Below are your admin login credentials, subscription details, and payment confirmation. <strong>Please save this email securely.</strong></p>

    <div class="section-title">🔐 Admin Login Credentials</div>
    <div class="cred-card">
      <div style="font-size:13px;font-weight:800;color:#0B1F3A;margin-bottom:16px;">⚕️ Hospital Admin Account</div>
      <div class="cred-row">
        <div class="cred-field">Admin Email / Username</div>
        <div class="cred-val">${adminEmail}</div>
      </div>
      <div class="cred-row">
        <div class="cred-field">Password</div>
        <div class="cred-val">${adminPassword}</div>
      </div>
      <div class="cred-row">
        <div class="cred-field">Hospital Code</div>
        <div class="cred-val">${hospitalCode}</div>
      </div>
    </div>

    <div class="alert-box">
      <p>🔒 <strong>Security Notice:</strong> Please log in to access your dashboard. Keep your credentials safe and do not share them with anyone.</p>
    </div>

    <div class="section-title">🏥 Registration Details</div>
    <div class="info-card">
      <div class="info-row"><span class="info-label">Hospital Name</span><span class="info-value">${hospitalName}</span></div>
      <div class="info-row"><span class="info-label">Hospital Code</span><span class="info-value">${hospitalCode}</span></div>
      <div class="info-row"><span class="info-label">Subscription Plan</span><span class="info-value">${planLabel}</span></div>
      <div class="info-row"><span class="info-label">Billing Cycle</span><span class="info-value">${cycleLabel}</span></div>
      <div class="info-row"><span class="info-label">Plan Expires On</span><span class="info-value">${expiryStr}</span></div>
    </div>

    <div class="section-title">💳 Payment Confirmation</div>
    <div class="info-card">
      <div class="info-row"><span class="info-label">Amount Paid</span><span class="info-value" style="color:#0F9D8A;font-size:16px;">${amountFormatted}</span></div>
      <div class="info-row"><span class="info-label">Payment Status</span><span class="info-value" style="color:#10b981;">✅ Successful</span></div>
      <div class="info-row"><span class="info-label">Payment Date</span><span class="info-value">${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
      <div class="info-row"><span class="info-label">Transaction ID</span><span class="info-value" style="font-family:monospace">${transactionId}</span></div>
    </div>

    <a href="${dashboardUrl}" class="cta-btn">🚀 Launch Hospital Admin Dashboard →</a>

    <div class="txn-box">
      <div class="txn-label">Transaction Reference</div>
      <div class="txn-id">${transactionId}</div>
    </div>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} CarePlus Healthcare Systems Pvt. Ltd. All rights reserved.</p>
    <p>For support contact <strong>support@careplus.com</strong> | This is an automated email, please do not reply.</p>
    <p style="margin-top:6px;color:#cbd5e1;">CarePlus HMS · Secure · HIPAA-Aligned · Multi-Tenant SaaS</p>
  </div>
</div></body></html>`;

  const info = await transporter.sendMail({
    from: `"CarePlus HMS" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@careplus.com'}>`,
    to,
    subject: `🎉 Welcome to CarePlus HMS – Your Dashboard is Live! [${hospitalCode}]`,
    html,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`📧 Welcome email preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
  console.log(`📨 Welcome email sent to ${to} for hospital ${hospitalCode}`);
  return info;
};

module.exports = { sendOtpEmail, sendWelcomeEmail };
