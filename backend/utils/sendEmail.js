const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
  try {
    console.log(`(SMTP) Sending email to: ${options.email} with subject: ${options.subject}`);
    
    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD?.replace(/\s+/g, ""),
      },
    });

    // 2) Define the email options
    const mailOptions = {
      from: `taskflow <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: options.email,
      subject: options.subject,
      text: options.message,
      html: options.html,
    };

    // 3) Actually send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully! ID: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error("Detailed error in sendEmail (SMTP):", err);
    throw err;
  }
};

module.exports = sendEmail;
