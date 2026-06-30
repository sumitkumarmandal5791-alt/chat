const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.EMAIL_PASSWORD
    }
})

transporter.verify()
    .catch((error) => console.error("SMTP Connection Failed", error))

const sendOtpToEmail = async (email, otp) => {

    const html = `
<div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
<h2 style="color: #075e54;">📩 AlyxChat Web Verification</h2>

<p>Hi there,</p>

<p>Your one-time password (OTP) to verify your AlyxChat account is:</p>

<h1 style="background: #e0f7fa; color: #000; padding: 10px 20px; display: inline-block;">
${otp}
</h1>

<p><strong>This OTP is valid for the next 10 minutes.</strong>
Please do not share it with anyone.</p>

<p>If you didn’t request this OTP, please ignore this email.</p>

<p style="margin-top: 20px;">
Thanks & Regards,<br/>
WhatsApp Web Security Team
</p>

<hr style="margin: 30px 0;" />

<small style="color: #777;">
This is an automated message. Please do not reply.
</small>
</div>
`;

    await transporter.sendMail({
        from: `"AlyxChat"<${process.env.EMAIL}>`,
        to: email,
        subject: "OTP for Login",
        html: html
    })
}

module.exports = sendOtpToEmail;