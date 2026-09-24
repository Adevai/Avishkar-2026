import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// SMTP settings come from the environment. The embedded defaults preserve the
// original demo behavior for local development — set EMAIL_USER / EMAIL_PASS
// (Gmail App Password) explicitly in production.
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
const EMAIL_USER = process.env.EMAIL_USER || 'refakshat1609@gmail.com';
const EMAIL_PASS = (process.env.EMAIL_PASS || 'ugemlyhtnoiykjic').replace(/\s+/g, '');

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
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
}): Promise<{ success: boolean; messageId?: string; error?: string; devOtp?: string }> {
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
    if (process.env.NODE_ENV !== 'production') {
      // Dev fallback: an unreachable SMTP server must never block local signups.
      console.warn(`[EmailService] DEV MODE OTP for ${toEmail}: ${otp}`);
      return { success: true, devOtp: otp, error: `SMTP unavailable — dev fallback active (${error.message})` };
    }
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
}): Promise<{ success: boolean; messageId?: string; error?: string; devOtp?: string }> {
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
    if (process.env.NODE_ENV !== 'production') {
      // Dev fallback: local signups keep working when Gmail SMTP is down/rate-limited.
      console.warn(`[EmailService] DEV MODE registration OTP for ${toEmail}: ${otp}`);
      return { success: true, devOtp: otp, error: `SMTP unavailable — dev fallback active (${error.message})` };
    }
    return { success: false, error: error.message };
  }
}

export async function sendJobAlertEmail({
  toEmail,
  userName = 'there',
  matches,
  unsubscribeUrl,
}: {
  toEmail: string;
  userName?: string;
  matches: { title: string; company: string; location: string; salary: string; matchScore: number }[];
  unsubscribeUrl: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const rows = matches.map(m => `
    <tr>
      <td style="padding:14px 16px;border-bottom:1px solid #1e293b;">
        <div style="color:#e2e8f0;font-size:14px;font-weight:700;">${m.title}</div>
        <div style="color:#94a3b8;font-size:12px;margin-top:2px;">${m.company} • ${m.location} • ${m.salary}</div>
      </td>
      <td style="padding:14px 16px;border-bottom:1px solid #1e293b;text-align:right;">
        <span style="display:inline-block;padding:6px 12px;background:rgba(16,185,129,0.15);border:1px solid rgba(52,211,153,0.4);border-radius:100px;color:#6ee7b7;font-size:13px;font-weight:800;">${m.matchScore}% match</span>
      </td>
    </tr>`).join('');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>S.P.A.R.K. Job Alerts</title></head>
    <body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding:40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#131b2e;border:1px solid #1e293b;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:32px 36px;background:linear-gradient(135deg,#1d4ed8 0%,#312e81 100%);border-bottom:1px solid rgba(255,255,255,0.1);">
                  <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">Your daily job matches 🎯</h1>
                  <p style="margin:6px 0 0 0;color:#cbd5e1;font-size:12px;">New openings scoring above 80% with your verified skills</p>
                </td>
              </tr>
              <tr>
                <td style="padding:28px 20px;">
                  <p style="margin:0 0 14px 8px;color:#e2e8f0;font-size:14px;">Hi <strong style="color:#60a5fa;">${userName}</strong>, ${matches.length} new opportunity(ies) fit you well:</p>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background:#0b0f19;border-radius:14px;border:1px solid #1e293b;">${rows}</table>
                  <p style="margin:18px 8px 0 8px;">
                    <a href="${process.env.PUBLIC_APP_URL || 'http://localhost:5174'}/dashboard" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none;">Open S.P.A.R.K. & apply →</a>
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 36px;background-color:#0b0f19;border-top:1px solid #1e293b;text-align:center;">
                  <p style="margin:0;color:#64748b;font-size:11px;">
                    You receive this because daily job alerts are enabled for your account.<br/>
                    <a href="${unsubscribeUrl}" style="color:#94a3b8;">Unsubscribe from job alerts</a>
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
      from: `"S.P.A.R.K. Job Alerts" <${EMAIL_USER}>`,
      to: toEmail,
      subject: `[S.P.A.R.K.] ${matches.length} new job match${matches.length === 1 ? '' : 'es'} above 80% for you`,
      text: `Hi ${userName}, ${matches.length} new opportunity(ies) match your skills above 80%:\n\n${matches.map(m => `- ${m.title} at ${m.company} (${m.location}) — ${m.matchScore}% match`).join('\n')}\n\nUnsubscribe: ${unsubscribeUrl}`,
      html: htmlContent,
    });
    console.log(`[EmailService] Job alert digest dispatched to ${toEmail} (${matches.length} matches)`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EmailService] Failed to send job alert to ${toEmail}:`, error.message);
    return { success: false, error: error.message };
  }
}

export async function sendSecurityAlertEmail({
  toEmail,
  userName = 'there',
  reason,
}: {
  toEmail: string;
  userName?: string;
  reason: 'password-changed' | 'account-overwritten';
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const isOverwrite = reason === 'account-overwritten';
  const subject = isOverwrite
    ? `[S.P.A.R.K.] Security alert: your account was re-registered`
    : `[S.P.A.R.K.] Security alert: your password was changed`;
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>S.P.A.R.K. Security Alert</title></head>
    <body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding:40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:540px;background-color:#131b2e;border:1px solid #1e293b;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:32px 36px;background:linear-gradient(135deg,#7f1d1d 0%,#450a0a 100%);color:#ffffff;">
                  <div style="display:inline-block;padding:6px 14px;background:rgba(239,68,68,0.2);border:1px solid rgba(248,113,113,0.4);border-radius:100px;color:#fecaca;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                    Security Alert
                  </div>
                  <h1 style="margin:14px 0 4px 0;font-size:22px;font-weight:800;">${isOverwrite ? 'Your account was re-registered' : 'Your password was changed'}</h1>
                  <p style="margin:0;font-size:12px;color:#fca5a5;">S.P.A.R.K. Account Security</p>
                </td>
              </tr>
              <tr>
                <td style="padding:36px;color:#e2e8f0;font-size:14px;line-height:1.6;">
                  <p>Hello <strong>${userName}</strong>,</p>
                  ${isOverwrite
                    ? `<p>Your S.P.A.R.K. account (<strong>${toEmail}</strong>) was just re-registered through the signup flow, which <strong>replaced the profile details and password</strong> of the existing account.</p>`
                    : `<p>The password for your S.P.A.R.K. account (<strong>${toEmail}</strong>) was changed on <strong>${new Date().toUTCString()}</strong>.</p>`}
                  <p>If this was you, no action is needed. If you did <strong>not</strong> authorize this change, your account may be compromised — please reset your password immediately or contact your portal administrator.</p>
                  <div style="margin-top:24px;padding:12px;background:#1e293b;border-radius:8px;font-size:12px;color:#94a3b8;">
                    Timestamp: ${new Date().toUTCString()}<br/>
                    Account: ${toEmail}
                  </div>
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0 0;color:#64748b;font-size:11px;">© ${new Date().getFullYear()} S.P.A.R.K. • Automated security notification</p>
          </td>
        </tr>
      </table>
    </html>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"S.P.A.R.K. Security" <${EMAIL_USER}>`,
      to: toEmail,
      subject,
      text: isOverwrite
        ? `Security alert: your S.P.A.R.K. account (${toEmail}) was re-registered and its password replaced. If this was not you, reset your password immediately.`
        : `Security alert: your S.P.A.R.K. password was changed. If this was not you, reset your password immediately.`,
      html: htmlContent,
    });
    console.log(`[EmailService] Security alert (${reason}) dispatched to ${toEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EmailService] Failed to send security alert to ${toEmail}:`, error.message);
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
