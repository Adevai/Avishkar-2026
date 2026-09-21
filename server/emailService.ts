import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const EMAIL_USER = process.env.EMAIL_USER || 'refakshat1609@gmail.com';
const EMAIL_PASS = (process.env.EMAIL_PASS || 'ugemlyhtnoiykjic').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // TLS
  requireTLS: true,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

export async function sendOtpEmail({
  toEmail,
  otp,
  userName = 'Valued User',
}: {
  toEmail: string;
  otp: string;
  userName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>S.P.A.R.K. Password Reset Verification</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #131b2e; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
              
              <!-- Header Gradient Banner -->
              <tr>
                <td style="padding: 32px 36px; background: linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%); border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <div style="display: inline-block; padding: 6px 14px; background: rgba(59, 130, 246, 0.2); border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 100px; color: #93c5fd; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                          Security Verification
                        </div>
                        <h1 style="margin: 14px 0 4px 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                          S.P.A.R.K.
                        </h1>
                        <p style="margin: 0; color: #cbd5e1; font-size: 12px; font-weight: 500;">
                          Smart Platform for Academia–Industry Readiness and Knowledge
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 36px;">
                  <p style="margin: 0 0 16px 0; color: #e2e8f0; font-size: 15px; line-height: 1.5;">
                    Hello <strong style="color: #60a5fa;">${userName}</strong>,
                  </p>
                  <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                    We received an authorization request to reset the password associated with your account (<span style="color: #e2e8f0; font-weight: 600;">${toEmail}</span>). Use the One-Time Password (OTP) below to authenticate your identity:
                  </p>

                  <!-- OTP Display Box -->
                  <div style="margin: 28px 0; padding: 24px 16px; background-color: #0b0f19; border: 2px dashed #3b82f6; border-radius: 16px; text-align: center;">
                    <span style="display: block; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                      Verification Code
                    </span>
                    <span style="display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; text-shadow: 0 0 20px rgba(56, 189, 248, 0.4);">
                      ${otp}
                    </span>
                    <span style="display: block; color: #f59e0b; font-size: 12px; font-weight: 600; margin-top: 10px;">
                      ⏱ Expires in 10 minutes
                    </span>
                  </div>

                  <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                    Enter this 6-digit code on the password recovery portal to complete your password update.
                  </p>

                  <!-- Warning Alert -->
                  <div style="margin: 24px 0 0 0; padding: 14px 16px; background-color: rgba(239, 68, 68, 0.1); border-left: 4px solid #ef4444; border-radius: 8px;">
                    <p style="margin: 0; color: #fca5a5; font-size: 12px; line-height: 1.5;">
                      <strong>Security Note:</strong> S.P.A.R.K. staff will never ask you for this code. If you did not initiate this password reset request, please ignore this email; your account remains secure.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 36px; background-color: #0b0f19; border-top: 1px solid #1e293b; text-align: center;">
                  <p style="margin: 0; color: #64748b; font-size: 11px;">
                    © ${new Date().getFullYear()} S.P.A.R.K. • Academia–Industry Readiness & Knowledge Platform
                  </p>
                  <p style="margin: 6px 0 0 0; color: #475569; font-size: 10px;">
                    Automated transmission from security system &bull; Do not reply to this email
                  </p>
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
      from: `"S.P.A.R.K. Security" <${EMAIL_USER}>`,
      to: toEmail,
      subject: `[S.P.A.R.K.] Your Password Reset OTP: ${otp}`,
      text: `Your S.P.A.R.K. password reset verification code is: ${otp}. It expires in 10 minutes.`,
      html: htmlContent,
    });

    console.log(`[EmailService] OTP successfully dispatched to ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EmailService] Failed to send OTP to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function sendRegistrationOtpEmail({
  toEmail,
  otp,
  userName = 'Valued User',
}: {
  toEmail: string;
  otp: string;
  userName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to S.P.A.R.K. - Email Verification</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #0b0f19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
          <td align="center" style="padding: 40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 540px; background-color: #131b2e; border: 1px solid #1e293b; border-radius: 24px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
              
              <!-- Header Gradient Banner -->
              <tr>
                <td style="padding: 32px 36px; background: linear-gradient(135deg, #1d4ed8 0%, #312e81 100%); border-bottom: 1px solid rgba(255,255,255,0.1);">
                  <table border="0" cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td>
                        <div style="display: inline-block; padding: 6px 14px; background: rgba(59, 130, 246, 0.25); border: 1px solid rgba(96, 165, 250, 0.4); border-radius: 100px; color: #93c5fd; font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase;">
                          Account Registration
                        </div>
                        <h1 style="margin: 14px 0 4px 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                          Welcome to S.P.A.R.K.
                        </h1>
                        <p style="margin: 0; color: #cbd5e1; font-size: 12px; font-weight: 500;">
                          Smart Platform for Academia–Industry Readiness and Knowledge
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 36px;">
                  <p style="margin: 0 0 16px 0; color: #e2e8f0; font-size: 15px; line-height: 1.5;">
                    Welcome <strong style="color: #60a5fa;">${userName}</strong>,
                  </p>
                  <p style="margin: 0 0 24px 0; color: #94a3b8; font-size: 14px; line-height: 1.6;">
                    Thank you for signing up for S.P.A.R.K.! To verify your email address (<span style="color: #e2e8f0; font-weight: 600;">${toEmail}</span>) and activate your account, please enter the One-Time Password (OTP) below:
                  </p>

                  <!-- OTP Display Box -->
                  <div style="margin: 28px 0; padding: 24px 16px; background-color: #0b0f19; border: 2px dashed #3b82f6; border-radius: 16px; text-align: center;">
                    <span style="display: block; color: #94a3b8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
                      Registration Verification Code
                    </span>
                    <span style="display: inline-block; font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; text-shadow: 0 0 20px rgba(56, 189, 248, 0.4);">
                      ${otp}
                    </span>
                    <span style="display: block; color: #f59e0b; font-size: 12px; font-weight: 600; margin-top: 10px;">
                      ⏱ Expires in 10 minutes
                    </span>
                  </div>

                  <p style="margin: 0 0 16px 0; color: #94a3b8; font-size: 13px; line-height: 1.5;">
                    Enter this code on the registration screen to complete your profile setup.
                  </p>

                  <!-- Security Note -->
                  <div style="margin: 24px 0 0 0; padding: 14px 16px; background-color: rgba(59, 130, 246, 0.08); border-left: 4px solid #3b82f6; border-radius: 8px;">
                    <p style="margin: 0; color: #93c5fd; font-size: 12px; line-height: 1.5;">
                      <strong>Security Tip:</strong> S.P.A.R.K. will never ask you to share your OTP code with anyone.
                    </p>
                  </div>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="padding: 24px 36px; background-color: #0b0f19; border-top: 1px solid #1e293b; text-align: center;">
                  <p style="margin: 0; color: #64748b; font-size: 11px;">
                    © ${new Date().getFullYear()} S.P.A.R.K. • Academia–Industry Readiness & Knowledge Platform
                  </p>
                  <p style="margin: 6px 0 0 0; color: #475569; font-size: 10px;">
                    Automated transmission from security system &bull; Do not reply to this email
                  </p>
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
      from: `"S.P.A.R.K. Registration" <${EMAIL_USER}>`,
      to: toEmail,
      subject: `[S.P.A.R.K.] Verify Your Email - OTP: ${otp}`,
      text: `Welcome to S.P.A.R.K.! Your registration email verification code is: ${otp}. It expires in 10 minutes.`,
      html: htmlContent,
    });

    console.log(`[EmailService] Registration OTP dispatched to ${toEmail} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EmailService] Failed to send registration OTP to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function sendPasswordResetSuccessEmail({
  toEmail,
  userName = 'Valued User',
}: {
  toEmail: string;
  userName?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Password Reset Successful</title></head>
    <body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding:40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;background-color:#131b2e;border:1px solid #1e293b;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:32px 36px;background:linear-gradient(135deg,#065f46 0%,#064e3b 100%);color:#ffffff;">
                  <h1 style="margin:0;font-size:22px;font-weight:800;">S.P.A.R.K. Account Updated</h1>
                  <p style="margin:6px 0 0 0;font-size:12px;color:#a7f3d0;">Security Notice</p>
                </td>
              </tr>
              <tr>
                <td style="padding:36px;color:#e2e8f0;font-size:14px;line-height:1.6;">
                  <p>Hello <strong>${userName}</strong>,</p>
                  <p>The password for your S.P.A.R.K. account (<strong>${toEmail}</strong>) was successfully reset on <strong>${new Date().toUTCString()}</strong>.</p>
                  <p>You can now log in to your portal with your new credentials.</p>
                  <div style="margin-top:24px;padding:12px;background:#1e293b;border-radius:8px;font-size:12px;color:#94a3b8;">
                    If you did not perform this change, please contact your portal administrator immediately.
                  </div>
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
      from: `"S.P.A.R.K. Security" <${EMAIL_USER}>`,
      to: toEmail,
      subject: `[S.P.A.R.K.] Password Changed Successfully`,
      text: `Your S.P.A.R.K. password was successfully updated. You can now log in with your new password.`,
      html: htmlContent,
    });
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
