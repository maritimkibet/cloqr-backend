const nodemailer = require('nodemailer');

// Create transporter with better error handling
let transporter = null;

const createTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.log('⚠️ Email credentials not configured');
    return null;
  }

  try {
    return nodemailer.createTransport({
      service: 'gmail', // Use Gmail service
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
  } catch (error) {
    console.error('Failed to create email transporter:', error);
    return null;
  }
};

const sendEmail = async (to, subject, text) => {
  if (!transporter) {
    transporter = createTransporter();
  }

  if (!transporter) {
    throw new Error('Email service not configured');
  }

  try {
    const info = await transporter.sendMail({
      from: `"Cloqr" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0A1628;">Cloqr Verification Code</h2>
          <p style="font-size: 16px; color: #333;">Your verification code is:</p>
          <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <h1 style="color: #0A1628; font-size: 32px; letter-spacing: 5px; margin: 0;">${text.match(/\d{6}/)?.[0] || text}</h1>
          </div>
          <p style="font-size: 14px; color: #666;">This code will expire in 10 minutes.</p>
          <p style="font-size: 14px; color: #666;">If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #999;">Cloqr - Campus Connect</p>
        </div>
      `,
    });
    console.log(`✅ Email sent to ${to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    throw error;
  }
};

module.exports = { sendEmail };
