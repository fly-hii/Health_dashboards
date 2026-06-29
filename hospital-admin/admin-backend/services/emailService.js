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

const sendStaffWelcomeEmail = async ({
  to, name, role, department, employeeId, password, hospitalName, hospitalCode
}) => {
  const transporter = await getTransporter();

  const portalLabels = {
    DOCTOR: 'Doctor Portal',
    NURSE: 'Nurse Portal',
    RECEPTIONIST: 'Receptionist Portal',
    PHARMACIST: 'Pharmacy Portal',
    LAB_TECHNICIAN: 'Laboratory Portal',
    ADMIN: 'Admin Portal',
    HOSPITAL_ADMIN: 'Admin Portal'
  };
  const portalLabel = portalLabels[role] || 'Staff Portal';

  // Resolve dashboard links based on role
  const portalLinks = {
    DOCTOR: 'http://localhost:5176',
    NURSE: 'http://localhost:5174',
    RECEPTIONIST: 'http://localhost:5173',
    PHARMACIST: 'http://localhost:5175',
    LAB_TECHNICIAN: 'http://localhost:5173',
    ADMIN: 'http://localhost:5173',
    HOSPITAL_ADMIN: 'http://localhost:5173'
  };
  const loginUrl = portalLinks[role] || 'http://localhost:5173';

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f0f4f8;color:#1e293b;}
  .wrapper{max-width:600px;margin:36px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.08);}
  .header{background:linear-gradient(135deg,#0B1F3A 0%,#0F9D8A 100%);padding:34px 40px;text-align:center;}
  .logo{font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;}
  .logo span{color:#5EEAD4;}
  .header-sub{margin-top:4px;color:rgba(255,255,255,0.75);font-size:12px;}
  .body{padding:36px 40px;}
  .greeting{font-size:18px;font-weight:700;color:#0B1F3A;margin-bottom:8px;}
  .intro{font-size:14px;color:#475569;line-height:1.7;margin-bottom:24px;}
  .section-title{font-size:10px;font-weight:800;color:#0F9D8A;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;margin-top:20px;}
  .cred-card{background:linear-gradient(135deg,#f0fdf9,#e0f2fe);border:2px solid #0F9D8A;border-radius:14px;padding:20px;margin-bottom:20px;}
  .cred-row{background:#fff;border-radius:8px;padding:10px 14px;margin-bottom:8px;border:1px solid #e2e8f0;}
  .cred-row:last-child{margin-bottom:0;}
  .cred-field{font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;}
  .cred-val{font-size:13px;font-weight:700;color:#0F9D8A;font-family:'Courier New',monospace;word-break:break-all;}
  .info-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:20px;}
  .info-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;}
  .info-row:last-child{border-bottom:none;}
  .info-label{font-size:12px;color:#64748b;font-weight:600;}
  .info-value{font-size:12px;color:#1e293b;font-weight:700;}
  .alert-box{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;}
  .alert-box p{font-size:12px;color:#92400e;line-height:1.6;}
  .cta-btn{display:block;padding:14px;background:linear-gradient(135deg,#0F9D8A,#0B7A70);color:#fff !important;text-align:center;text-decoration:none;border-radius:10px;font-size:14px;font-weight:800;margin-bottom:20px;}
  .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;}
  .footer p{font-size:11px;color:#94a3b8;line-height:1.9;}
</style></head>
<body><div class="wrapper">
  <div class="header">
    <div class="logo">Care<span>Plus</span> HMS</div>
    <div class="header-sub">Staff Account Provisioned Successfully</div>
  </div>
  <div class="body">
    <p class="greeting">Hello, ${name}! Welcome onboard. 🎉</p>
    <p class="intro">Your employee account has been created at <strong>${hospitalName}</strong>. You have been assigned the role of <strong>${role}</strong>. Below are your secure credentials to access the ${portalLabel}.</p>

    <div class="section-title">🔐 Your Login Credentials</div>
    <div class="cred-card">
      <div class="cred-row">
        <div class="cred-field">Login Email / Username</div>
        <div class="cred-val">${to}</div>
      </div>
      <div class="cred-row">
        <div class="cred-field">Password</div>
        <div class="cred-val">${password}</div>
      </div>
      ${hospitalCode ? `
      <div class="cred-row">
        <div class="cred-field">Hospital Code</div>
        <div class="cred-val">${hospitalCode}</div>
      </div>
      ` : ''}
    </div>

    <div class="alert-box">
      <p>🔒 <strong>Security Alert:</strong> Please log in to access your portal. Keep your login credentials safe and do not share them with anyone.</p>
    </div>

    <div class="section-title">📋 Account Details</div>
    <div class="info-card">
      <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">${name}</span></div>
      <div class="info-row"><span class="info-label">Employee ID</span><span class="info-value">${employeeId}</span></div>
      <div class="info-row"><span class="info-label">assigned Role</span><span class="info-value">${role}</span></div>
      <div class="info-row"><span class="info-label">Department</span><span class="info-value">${department}</span></div>
      <div class="info-row"><span class="info-label">Hospital</span><span class="info-value">${hospitalName}</span></div>
    </div>

    <a href="${loginUrl}" class="cta-btn">🚀 Access ${portalLabel} →</a>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} CarePlus Healthcare Systems. All rights reserved.</p>
    <p>This is a system generated notification. Please contact your hospital administrator for queries.</p>
  </div>
</div></body></html>`;

  const roleFriendlyNames = {
    DOCTOR: 'Doctor',
    NURSE: 'Nurse',
    RECEPTIONIST: 'Receptionist',
    PHARMACIST: 'Pharmacist',
    LAB_TECHNICIAN: 'Lab Technician',
    ADMIN: 'Admin',
    HOSPITAL_ADMIN: 'Hospital Admin'
  };
  const roleFriendly = roleFriendlyNames[role] || 'Staff';

  const info = await transporter.sendMail({
    from: `"CarePlus HMS" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@careplus.com'}>`,
    to,
    subject: `🎉 Your CarePlus ${roleFriendly} Account is Ready! – [${employeeId}]`,
    html,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`📧 Welcome email preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
  console.log(`📨 Staff welcome email sent to ${to} for employee ${employeeId}`);
  return info;
};

const sendPatientWelcomeEmail = async ({
  to, name, patientId, password, hospitalName, hospitalCode
}) => {
  const transporter = await getTransporter();
  const loginUrl = 'http://localhost:5177';

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Segoe UI',Helvetica,Arial,sans-serif;background:#f0f4f8;color:#1e293b;}
  .wrapper{max-width:600px;margin:36px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.08);}
  .header{background:linear-gradient(135deg,#0B1F3A 0%,#0F9D8A 100%);padding:34px 40px;text-align:center;}
  .logo{font-size:26px;font-weight:900;color:#fff;letter-spacing:-1px;}
  .logo span{color:#5EEAD4;}
  .header-sub{margin-top:4px;color:rgba(255,255,255,0.75);font-size:12px;}
  .body{padding:36px 40px;}
  .greeting{font-size:18px;font-weight:700;color:#0B1F3A;margin-bottom:8px;}
  .intro{font-size:14px;color:#475569;line-height:1.7;margin-bottom:24px;}
  .section-title{font-size:10px;font-weight:800;color:#0F9D8A;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:10px;margin-top:20px;}
  .cred-card{background:linear-gradient(135deg,#f0fdf9,#e0f2fe);border:2px solid #0F9D8A;border-radius:14px;padding:20px;margin-bottom:20px;}
  .cred-row{background:#fff;border-radius:8px;padding:10px 14px;margin-bottom:8px;border:1px solid #e2e8f0;}
  .cred-row:last-child{margin-bottom:0;}
  .cred-field{font-size:9px;color:#64748b;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:3px;}
  .cred-val{font-size:13px;font-weight:700;color:#0F9D8A;font-family:'Courier New',monospace;word-break:break-all;}
  .info-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:16px 20px;margin-bottom:20px;}
  .info-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f1f5f9;}
  .info-row:last-child{border-bottom:none;}
  .info-label{font-size:12px;color:#64748b;font-weight:600;}
  .info-value{font-size:12px;color:#1e293b;font-weight:700;}
  .alert-box{background:#fffbeb;border:1px solid #fde68a;border-radius:10px;padding:14px 18px;margin-bottom:20px;}
  .alert-box p{font-size:12px;color:#92400e;line-height:1.6;}
  .cta-btn{display:block;padding:14px;background:linear-gradient(135deg,#0F9D8A,#0B7A70);color:#fff !important;text-align:center;text-decoration:none;border-radius:10px;font-size:14px;font-weight:800;margin-bottom:20px;}
  .footer{background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;}
  .footer p{font-size:11px;color:#94a3b8;line-height:1.9;}
</style></head>
<body><div class="wrapper">
  <div class="header">
    <div class="logo">Care<span>Plus</span> HMS</div>
    <div class="header-sub">Patient Account Created Successfully</div>
  </div>
  <div class="body">
    <p class="greeting">Hello, ${name}! 🎉</p>
    <p class="intro">Your medical records profile has been registered at <strong>${hospitalName}</strong>. You have been assigned the Patient ID: <strong>${patientId}</strong>. You can now log in to the Patient Dashboard to book appointments, view prescriptions, and download lab reports.</p>

    <div class="section-title">🔐 Your Patient Portal Login</div>
    <div class="cred-card">
      <div class="cred-row">
        <div class="cred-field">Login Email / Username</div>
        <div class="cred-val">${to}</div>
      </div>
      <div class="cred-row">
        <div class="cred-field">Password</div>
        <div class="cred-val">${password}</div>
      </div>
      ${hospitalCode ? `
      <div class="cred-row">
        <div class="cred-field">Hospital Code</div>
        <div class="cred-val">${hospitalCode}</div>
      </div>
      ` : ''}
    </div>

    <div class="alert-box">
      <p>🔒 <strong>Security Notice:</strong> Keep your login credentials secure. You can update your password at any time inside the dashboard settings.</p>
    </div>

    <div class="section-title">📋 Registration Details</div>
    <div class="info-card">
      <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">${name}</span></div>
      <div class="info-row"><span class="info-label">Patient ID</span><span class="info-value">${patientId}</span></div>
      <div class="info-row"><span class="info-label">Hospital</span><span class="info-value">${hospitalName}</span></div>
    </div>

    <a href="${loginUrl}" class="cta-btn">🚀 Access Patient Dashboard →</a>
  </div>
  <div class="footer">
    <p>© ${new Date().getFullYear()} CarePlus Healthcare Systems. All rights reserved.</p>
    <p>This is a system generated notification. Please contact your hospital for any medical queries.</p>
  </div>
</div></body></html>`;

  const info = await transporter.sendMail({
    from: `"CarePlus HMS" <${process.env.SMTP_FROM || process.env.SMTP_USER || 'no-reply@careplus.com'}>`,
    to,
    subject: `🎉 Your CarePlus Patient Portal is Ready! – [${patientId}]`,
    html,
  });

  if (!process.env.SMTP_HOST) {
    console.log(`📧 Patient welcome email preview: ${nodemailer.getTestMessageUrl(info)}`);
  }
  console.log(`📨 Patient welcome email sent to ${to} for patient ${patientId}`);
  return info;
};

module.exports = { sendOtpEmail, sendStaffWelcomeEmail, sendPatientWelcomeEmail };
