const nodemailer = require('nodemailer');

/**
 * Creates a Nodemailer transporter.
 * Uses Gmail SMTP when EMAIL_USER and EMAIL_PASS are set in .env,
 * otherwise falls back to Ethereal (test account) or console logging.
 */
const createTransporter = async () => {
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    // Production: Gmail SMTP (use an App Password, not your normal password)
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Development fallback: Ethereal fake SMTP (no real emails sent)
  const testAccount = await nodemailer.createTestAccount();
  console.warn('[Email] No EMAIL_USER/EMAIL_PASS set. Using Ethereal test account.');
  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

/**
 * Sends an OTP verification email to the given address.
 * @param {string} toEmail  - Recipient email address
 * @param {string} otp      - 6-digit OTP code
 * @param {string} name     - Recipient's name
 */
const sendOTPEmail = async (toEmail, otp, name = 'Student') => {
  try {
    const transporter = await createTransporter();

    const mailOptions = {
      from: `"Campus Canteen 🍽️" <${process.env.EMAIL_USER || 'noreply@campuscanteen.com'}>`,
      to: toEmail,
      subject: `Your Campus Canteen Verification Code: ${otp} (Ref: ${new Date().getTime().toString().slice(-4)})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:40px 0;">
            <tr>
              <td align="center">
                <table width="480" cellpadding="0" cellspacing="0"
                  style="background:#1e293b;border-radius:16px;overflow:hidden;border:1px solid #334155;">
                  <!-- Header -->
                  <tr>
                    <td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:28px 32px;text-align:center;">
                      <h1 style="margin:0;color:#0f172a;font-size:20px;font-weight:800;letter-spacing:-0.5px;">
                        🍽️ Campus Canteen
                      </h1>
                      <p style="margin:4px 0 0;color:#451a03;font-size:12px;font-weight:500;">
                        Email Verification
                      </p>
                    </td>
                  </tr>
                  <!-- Body -->
                  <tr>
                    <td style="padding:32px;">
                      <p style="margin:0 0 8px;color:#94a3b8;font-size:13px;">Hello, <strong style="color:#e2e8f0;">${name}</strong></p>
                      <p style="margin:0 0 24px;color:#64748b;font-size:12px;line-height:1.6;">
                        Use the verification code below to complete your registration.
                        This code expires in <strong style="color:#f59e0b;">10 minutes</strong>.
                      </p>

                      <!-- OTP Box -->
                      <div style="background:#0f172a;border:1px dashed #f59e0b;border-radius:12px;
                                  padding:20px;text-align:center;margin:0 0 24px;">
                        <p style="margin:0 0 4px;color:#64748b;font-size:10px;text-transform:uppercase;letter-spacing:2px;">
                          Verification Code
                        </p>
                        <p style="margin:0;color:#f59e0b;font-size:36px;font-weight:900;letter-spacing:8px;
                                  font-family:monospace;">
                          ${otp}
                        </p>
                      </div>

                      <p style="margin:0 0 8px;color:#475569;font-size:11px;line-height:1.6;">
                        If you did not register for Campus Canteen, you can safely ignore this email.
                      </p>
                      <p style="margin:0;color:#475569;font-size:11px;">
                        Do not share this code with anyone.
                      </p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="background:#0f172a;padding:16px 32px;border-top:1px solid #1e293b;">
                      <p style="margin:0;color:#334155;font-size:10px;text-align:center;">
                        © ${new Date().getFullYear()} Campus Canteen System · Automated email, do not reply
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    };

    const info = await transporter.sendMail(mailOptions);

    if (nodemailer.getTestMessageUrl(info)) {
      // Ethereal preview URL (only in dev/test mode)
      console.log(`[Email] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    } else {
      console.log(`[Email] OTP sent to ${toEmail} — Message ID: ${info.messageId}`);
    }

    return { success: true };
  } catch (error) {
    console.error('[Email] Failed to send OTP email:', error.message);
    // Non-fatal: log OTP to console as fallback so dev can still test
    console.log(`\n[FALLBACK OTP] User: ${toEmail} | Code: ${otp}\n`);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTPEmail };
