const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

async function sendBookingConfirmation(to, bookingInfo) {
    const mailOptions = {
        from: process.env.SMTP_USER,
        to,
        subject: '訂位成功通知',
        html: `
            <h2>親愛的顧客您好，您的訂位已成功！</h2>
            <p><b>餐廳名稱：</b>${bookingInfo.clientname || ''}</p>
            <p>訂位日期：${bookingInfo.date}</p>
            <p>訂位時間：${bookingInfo.time}</p>
            <p>人數：${bookingInfo.adults}大 ${bookingInfo.children}小</p>
            <p>訂位編號：${bookingInfo.bookingId}</p>
            <p>如有任何問題，請聯絡我們。</p>
        `
    };
    return transporter.sendMail(mailOptions);
}

module.exports = { sendBookingConfirmation };