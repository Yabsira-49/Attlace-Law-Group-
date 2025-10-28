const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: true, // true for 465
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

exports.sendVerification = async (recipient, code) => {
    const mailOptions = {
        from: `"USCIS App" <${process.env.EMAIL_USER}>`,
        to: recipient,
        subject: "Email Verification Code",
        text: `Your verification code is: ${code}\nIt expires in 15 minutes.`
    };
    return transporter.sendMail(mailOptions);
};
exports.sendMail = async (to, subject, body) => {
    const mailOptions = {
        from: `"USCIS App" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        text: body
    };
    return transporter.sendMail(mailOptions);
};
