const nodemailer = require("nodemailer");
const dns = require("dns").promises;

const sendEmail = async (options) => {
  try {
    console.log(`(SMTP) Sending email to: ${options.email} with subject: ${options.subject}`);
    
    // 0) Manually resolve the IPv4 address to completely bypass Render's broken IPv6 DNS
    let smtpHostIp;
    try {
      const { address } = await dns.lookup(process.env.EMAIL_HOST, { family: 4 });
      smtpHostIp = address;
      console.log(`Resolved ${process.env.EMAIL_HOST} to IPv4: ${smtpHostIp}`);
    } catch (dnsErr) {
      console.error("DNS lookup failed, falling back to hostname:", dnsErr);
      smtpHostIp = process.env.EMAIL_HOST; // fallback
    }

    // 1) Create a transporter
    const transporter = nodemailer.createTransport({
      host: smtpHostIp, // Connect directly to the IPv4 IP address string
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD?.replace(/\s+/g, ""),
      },
      tls: {
        rejectUnauthorized: false,
        servername: process.env.EMAIL_HOST, // Required for TLS certificate matching when connecting via IP
      },
      connectionTimeout: 20000, // 20 seconds
      greetingTimeout: 20000,
    });

    // 2) Define the email options
    const mailOptions = {
      from: `TaskFlow <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
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
