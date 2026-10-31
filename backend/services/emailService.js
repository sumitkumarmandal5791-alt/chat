const nodemailer = require('nodemailer');

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER || process.env.EMAIL;
const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASSWORD;

const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465, // true for 465, false for 587 / STARTTLS
    auth: {
        user: smtpUser,
        pass: smtpPass
    },
    tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
    }
});

// Verify connection on startup
const verifyEmailConnection = async () => {
    if (!smtpUser || !smtpPass) {
        console.warn('⚠️  [SMTP WARNING] SMTP_USER or SMTP_PASS not set. Email delivery will fail.');
        return false;
    }
    try {
        await transporter.verify();
        console.log('✅ [SMTP READY] Nodemailer connected successfully to', smtpHost);
        return true;
    } catch (err) {
        console.error('❌ [SMTP ERROR] Transporter connection verification failed:', err.message);
        return false;
    }
};

/**
 * Send 6-digit OTP email with HTML and Plain Text versions
 */
const sendOtpEmail = async (toEmail, otp) => {
    const appName = process.env.APP_NAME || 'WhatsApp Web';
    const plainText = `Your ${appName} verification code is: ${otp}\n\nThis code is valid for 5 minutes. Do not share it with anyone.`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${appName} Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f2f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f0f2f5; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 460px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.06); overflow: hidden; border: 1px solid #e9edef;">
          <!-- Header Bar -->
          <tr>
            <td style="background-color: #008069; padding: 24px 32px; text-align: center;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 600; letter-spacing: -0.3px;">${appName}</h1>
            </td>
          </tr>
          <!-- Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; text-align: left; color: #111b21;">
              <h2 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #111b21;">Verify Your Account</h2>
              <p style="margin: 0 0 24px 0; font-size: 14px; color: #54656f; line-height: 1.5;">
                Please use the one-time verification code below to complete your login or registration.
              </p>
              <!-- OTP Box -->
              <div style="background-color: #f0f2f5; border-radius: 8px; border: 1px solid #e9edef; padding: 18px; text-align: center; margin-bottom: 24px;">
                <span style="font-family: monospace; font-size: 32px; font-weight: 700; color: #008069; letter-spacing: 8px;">${otp}</span>
              </div>
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #54656f;">
                ⏱️ <strong>Valid for 5 minutes.</strong> For security, never share this code with anyone.
              </p>
              <p style="margin: 0; font-size: 12px; color: #8696a0;">
                If you did not request this verification, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; background-color: #f7f9fa; border-top: 1px solid #e9edef; text-align: center; font-size: 12px; color: #8696a0;">
              &copy; ${new Date().getFullYear()} ${appName}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

    try {
        const info = await transporter.sendMail({
            from: `"${appName}" <${smtpUser}>`,
            to: toEmail,
            subject: `${otp} is your ${appName} verification code`,
            text: plainText,
            html
        });
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('Email send failed to recipient:', toEmail.replace(/(?<=.{2}).(?=[^@]*?@)/g, '*'), err.message);
        throw { status: 502, message: 'Failed to deliver verification email. Please verify SMTP settings.' };
    }
};

module.exports = {
    transporter,
    verifyEmailConnection,
    sendOtpEmail
};

