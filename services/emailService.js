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
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>訂位成功通知</title>
            <style>
                * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                }
                
                body {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    background-color: #f8f8f8;
                    padding: 20px;
                }
                
                .email-container {
                    max-width: 600px;
                    margin: 0 auto;
                    background: white;
                    border-radius: 16px;
                    overflow: hidden;
                    box-shadow: 0 4px 24px rgba(0,0,0,0.08);
                }
                
                /* Logo Banner 區域 */
                .logo-banner {
                    width: 100%;
                    padding: 0;
                    text-align: center;
                    background: white;
                }
                
                .logo-banner img {
                    width: 100%;
                    height: auto;
                    max-height: 120px;
                    object-fit: contain;
                    display: block;
                }
                
                .email-header {
                    background: #fafafa;
                    padding: 2rem;
                    border-bottom: 1px solid #f0f0f0;
                    text-align: center;
                }
                
                .restaurant-name {
                    font-size: 2.2rem;
                    font-weight: 900;
                    color: #111;
                    letter-spacing: 2px;
                    margin-bottom: 0.5rem;
                }
                
                .email-title {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: #333;
                    margin-bottom: 0.5rem;
                }
                
                .email-subtitle {
                    color: #666;
                    font-size: 1rem;
                }
                
                .email-body {
                    padding: 2.5rem;
                }
                
                .success-badge {
                    background: #333;
                    color: white;
                    padding: 0.8rem 1.5rem;
                    border-radius: 50px;
                    font-weight: 600;
                    text-align: center;
                    margin-bottom: 2rem;
                    display: inline-block;
                    width: 100%;
                    box-sizing: border-box;
                }
                
                .booking-details {
                    background: #fafafa;
                    border: 1px solid #f0f0f0;
                    border-radius: 12px;
                    padding: 2rem;
                    margin: 2rem 0;
                }
                
                .detail-grid {
                    display: table;
                    width: 100%;
                }
                
                .detail-row {
                    display: table-row;
                }
                
                .detail-label {
                    display: table-cell;
                    font-weight: 600;
                    color: #333;
                    padding: 0.75rem 1rem 0.75rem 0;
                    width: 30%;
                    vertical-align: top;
                }
                
                .detail-value {
                    display: table-cell;
                    color: #666;
                    font-weight: 500;
                    padding: 0.75rem 0;
                    vertical-align: top;
                }
                
                .booking-id {
                    background: #333;
                    color: white;
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    font-weight: 600;
                    font-family: 'Courier New', monospace;
                    letter-spacing: 1px;
                }
                
                .notice-section {
                    background: #fff8f0;
                    border-left: 4px solid #ff9800;
                    padding: 1.5rem;
                    margin: 2rem 0;
                    border-radius: 0 8px 8px 0;
                }
                
                .notice-title {
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 0.5rem;
                }
                
                .notice-text {
                    color: #666;
                    font-size: 0.95rem;
                }
                
                .email-footer {
                    background: #fafafa;
                    padding: 2rem;
                    text-align: center;
                    border-top: 1px solid #f0f0f0;
                    color: #666;
                    font-size: 0.9rem;
                }
                
                .footer-logo {
                    font-weight: 700;
                    color: #333;
                    margin-bottom: 0.5rem;
                }
                
                /* 響應式設計 */
                @media only screen and (max-width: 600px) {
                    .email-container {
                        margin: 0;
                        border-radius: 0;
                    }
                    
                    .logo-banner img {
                        max-height: 80px;
                    }
                    
                    .email-header,
                    .email-body,
                    .email-footer {
                        padding: 1.5rem;
                    }
                    
                    .restaurant-name {
                        font-size: 1.8rem;
                        letter-spacing: 1px;
                    }
                    
                    .email-title {
                        font-size: 1.3rem;
                    }
                    
                    .booking-details {
                        padding: 1.5rem;
                    }
                    
                    .detail-label,
                    .detail-value {
                        display: block;
                        width: 100%;
                        padding: 0.5rem 0;
                    }
                    
                    .detail-label {
                        font-weight: 700;
                        margin-bottom: 0.25rem;
                    }
                }
            </style>
        </head>
        <body>
            <div class="email-container">
                <!-- Logo Banner -->
                ${bookingInfo.logoUrl ? `
                <div class="logo-banner">
                    <img src="${bookingInfo.logoUrl}" alt="Restaurant Banner">
                </div>
                ` : ''}
                
                <!-- Header -->
                <div class="email-header">
                    <div class="restaurant-name">${bookingInfo.clientname || 'Restaurant'}</div>
                    <div class="email-title">訂位確認通知</div>
                    <div class="email-subtitle">您的訂位已成功確認</div>
                </div>
                
                <!-- Body -->
                <div class="email-body">
                    <div class="success-badge">
                        ✓ 訂位成功確認
                    </div>
                    
                    <p style="color: #666; margin-bottom: 2rem; line-height: 1.6;">
                        親愛的顧客您好，<br>
                        感謝您選擇我們的餐廳。您的訂位已成功確認，我們期待為您提供優質的用餐體驗。
                    </p>
                    
                    <!-- 訂位詳情 -->
                    <div class="booking-details">
                        <h3 style="margin-bottom: 1.5rem; color: #333; font-weight: 700;">訂位詳情</h3>
                        <div class="detail-grid">
                            <div class="detail-row">
                                <div class="detail-label">餐廳名稱：</div>
                                <div class="detail-value">${bookingInfo.clientname || '餐廳'}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">用餐日期：</div>
                                <div class="detail-value">${bookingInfo.date}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">用餐時間：</div>
                                <div class="detail-value">${bookingInfo.time}</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">用餐人數：</div>
                                <div class="detail-value">${bookingInfo.adults}大 ${bookingInfo.children}小</div>
                            </div>
                            <div class="detail-row">
                                <div class="detail-label">訂位編號：</div>
                                <div class="detail-value">
                                    <span class="booking-id">${bookingInfo.bookingId}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 重要提醒 -->
                    <div class="notice-section">
                        <div class="notice-title">重要提醒</div>
                        <div class="notice-text">
                            • 請準時到達，如需取消或變更請提前24小時聯絡我們<br>
                            • 如遲到超過15分鐘，我們可能無法保留您的座位<br>
                            • 用餐時間限制為2小時
                        </div>
                    </div>
                    
                    <p style="color: #666; margin-top: 2rem;">
                        如有任何問題或需要協助，請隨時與我們聯絡。<br>
                        再次感謝您的預訂，期待您的光臨！
                    </p>
                </div>
                
                <!-- Footer -->
                <div class="email-footer">
                    <div class="footer-logo">${bookingInfo.clientname || 'Restaurant'}</div>
                    <div>此為系統自動發送的郵件，請勿直接回覆</div>
                </div>
            </div>
        </body>
        </html>
        `
    };
    return transporter.sendMail(mailOptions);
}

module.exports = { sendBookingConfirmation };