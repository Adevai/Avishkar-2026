import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// SMTP settings are environment-only — no credential fallbacks in code.
// In non-production, a missing/misconfigured SMTP keeps signup and email
// flows alive via the DEV fallbacks in each sender (logged OTP / reminder).
const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10) || 587;
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

if (!EMAIL_USER || !EMAIL_PASS) {
  const scope = process.env.NODE_ENV === 'production' ? 'PRODUCTION' : 'dev';
  console.warn(
    `[EmailService] EMAIL_USER/EMAIL_PASS not set — real email sending is disabled (${scope}).` +
    (process.env.NODE_ENV !== 'production' ? ' DEV fallbacks will be used for OTPs and reminders.' : ' Configure SMTP before deploying!')
  );
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false, // TLS
  requireTLS: true,
  ...(EMAIL_USER && EMAIL_PASS
    ? { auth: { user: EMAIL_USER, pass: EMAIL_PASS } }
    : {}),
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

function icsEscape(text: string): string {
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function icsBasicUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/**
 * RFC 5545 calendar invite for an interview slot. Imported into Google
 * Calendar / Outlook / Apple Calendar with a 1-hour display alarm.
 */
export function buildInterviewIcs(params: {
  slotId: string;
  jobTitle: string;
  company: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: string;
  meetingUrl?: string | null;
  notes?: string | null;
}): string {
  const start = new Date(params.scheduledAt);
  const end = new Date(start.getTime() + (params.durationMinutes || 45) * 60_000);
  const modeLabel = params.mode === 'in-person' ? 'In-person' : params.mode === 'phone' ? 'Phone call' : 'Online';
  const descriptionLines = [
    `${modeLabel} interview for ${params.jobTitle} at ${params.company}.`,
    params.meetingUrl ? `Join: ${params.meetingUrl}` : '',
    params.notes ? `Notes: ${params.notes}` : '',
  ].filter(Boolean);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//S.P.A.R.K.//Interview Scheduler//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${icsEscape(params.slotId)}@interviews.spark`,
    `DTSTAMP:${icsBasicUtc(new Date().toISOString())}`,
    `DTSTART:${icsBasicUtc(start.toISOString())}`,
    `DTEND:${icsBasicUtc(end.toISOString())}`,
    `SUMMARY:${icsEscape(`Interview — ${params.jobTitle} @ ${params.company}`)}`,
    `DESCRIPTION:${icsEscape(descriptionLines.join('\n'))}`,
    `LOCATION:${icsEscape(params.meetingUrl || modeLabel)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-PT1H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${icsEscape(`Interview in 1 hour — ${params.jobTitle} @ ${params.company}`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n') + '\r\n';
}

export async function sendInterviewConfirmationEmail({
  toEmail,
  userName = 'there',
  jobTitle,
  company,
  scheduledAt,
  durationMinutes,
  mode,
  meetingUrl,
  notes,
  ics,
}: {
  toEmail: string;
  userName?: string;
  jobTitle: string;
  company: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: string;
  meetingUrl?: string;
  notes?: string;
  ics: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const when = new Date(scheduledAt);
  const whenLabel = when.toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });
  const modeLabel = mode === 'in-person' ? 'In-person' : mode === 'phone' ? 'Phone call' : 'Online';
  const meetingBlock = meetingUrl
    ? `<p style="margin:0 0 12px 0;"><a href="${meetingUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none;">Join the meeting →</a></p>`
    : '';
  const notesBlock = notes
    ? `<div style="margin:14px 0 0 0;padding:12px;background:#1e293b;border-radius:10px;font-size:12px;color:#94a3b8;"><strong style="color:#cbd5e1;">Notes from the recruiter:</strong> ${notes}</div>`
    : '';
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>S.P.A.R.K. Interview Invitation</title></head>
    <body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding:40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#131b2e;border:1px solid #1e293b;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:32px 36px;background:linear-gradient(135deg,#1e3a8a 0%,#1e1b4b 100%);border-bottom:1px solid rgba(255,255,255,0.1);">
                  <div style="display:inline-block;padding:6px 14px;background:rgba(59,130,246,0.2);border:1px solid rgba(96,165,250,0.4);border-radius:100px;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                    Interview Invitation
                  </div>
                  <h1 style="margin:14px 0 4px 0;color:#ffffff;font-size:22px;font-weight:800;">You have an interview scheduled</h1>
                  <p style="margin:0;color:#cbd5e1;font-size:12px;">S.P.A.R.K. Interview Scheduler</p>
                </td>
              </tr>
              <tr>
                <td style="padding:36px;">
                  <p style="margin:0 0 16px 0;color:#e2e8f0;font-size:15px;">Hello <strong style="color:#60a5fa;">${userName}</strong>,</p>
                  <p style="margin:0 0 20px 0;color:#94a3b8;font-size:14px;line-height:1.6;">
                    Great news — a recruiter has booked your interview slot:
                  </p>
                  <div style="margin:0 0 20px 0;padding:20px;background:#0b0f19;border:1px solid #1e293b;border-radius:14px;">
                    <div style="color:#e2e8f0;font-size:16px;font-weight:800;">${jobTitle}</div>
                    <div style="color:#94a3b8;font-size:12px;margin:2px 0 14px 0;">${company}</div>
                    <div style="color:#cbd5e1;font-size:13px;margin:4px 0;">🗓 <strong>${whenLabel}</strong> (IST)</div>
                    <div style="color:#cbd5e1;font-size:13px;margin:4px 0;">⏱ ${durationMinutes} minutes</div>
                    <div style="color:#cbd5e1;font-size:13px;margin:4px 0;">📍 ${modeLabel}</div>
                  </div>
                  ${meetingBlock}
                  ${notesBlock}
                  <p style="margin:20px 0 0 0;color:#64748b;font-size:12px;line-height:1.6;">
                    The calendar invite (.ics) is attached — add it to Google Calendar, Outlook, or Apple Calendar so the slot lands in your schedule automatically.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 36px;background-color:#0b0f19;border-top:1px solid #1e293b;text-align:center;">
                  <p style="margin:0;color:#64748b;font-size:11px;">© ${new Date().getFullYear()} S.P.A.R.K. • Automated interview invitation</p>
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
      from: `"S.P.A.R.K. Interview Scheduler" <${EMAIL_USER}>`,
      to: toEmail,
      subject: `[S.P.A.R.K.] Interview invitation: ${jobTitle} @ ${company} — ${whenLabel} (IST)`,
      text: `Hi ${userName}, your interview for ${jobTitle} at ${company} is booked for ${whenLabel} (IST), ${durationMinutes} min, ${modeLabel}.${meetingUrl ? ` Join: ${meetingUrl}` : ''}${notes ? ` Notes: ${notes}` : ''} Calendar invite attached.`,
      html: htmlContent,
      attachments: [{ filename: 'interview-invite.ics', content: ics, contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }],
    });
    console.log(`[EmailService] Interview confirmation dispatched to ${toEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EmailService] Failed to send interview confirmation to ${toEmail}:`, error.message);
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[EmailService] DEV MODE interview confirmation for ${toEmail}: ${jobTitle} @ ${company}, ${scheduledAt}`);
      return { success: true, error: `SMTP unavailable — dev fallback active (${error.message})` };
    }
    return { success: false, error: error.message };
  }
}

export async function sendInterviewReminderEmail({
  toEmail,
  userName = 'there',
  jobTitle,
  company,
  scheduledAt,
  durationMinutes,
  mode,
  meetingUrl,
  notes,
  kind,
  ics,
}: {
  toEmail: string;
  userName?: string;
  jobTitle: string;
  company: string;
  scheduledAt: string;
  durationMinutes: number;
  mode: string;
  meetingUrl?: string;
  notes?: string;
  kind: '24h' | '2h';
  ics?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const when = new Date(scheduledAt);
  const whenLabel = when.toLocaleString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata',
  });
  const countdown = kind === '24h' ? 'in about 24 hours' : 'in about 2 hours';
  const modeLabel = mode === 'in-person' ? 'In-person' : mode === 'phone' ? 'Phone' : 'Online';
  const meetingBlock = meetingUrl
    ? `<p style="margin:0 0 12px 0;"><a href="${meetingUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#ffffff;border-radius:12px;font-size:13px;font-weight:700;text-decoration:none;">Join the meeting →</a></p>`
    : '';
  const notesBlock = notes
    ? `<div style="margin:14px 0 0 0;padding:12px;background:#1e293b;border-radius:10px;font-size:12px;color:#94a3b8;"><strong style="color:#cbd5e1;">Notes from the recruiter:</strong> ${notes}</div>`
    : '';
  const urgencyColor = kind === '2h' ? '#f59e0b' : '#2563eb';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>S.P.A.R.K. Interview Reminder</title></head>
    <body style="margin:0;padding:0;background-color:#0b0f19;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <table border="0" cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td align="center" style="padding:40px 10px;">
            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;background-color:#131b2e;border:1px solid #1e293b;border-radius:24px;overflow:hidden;">
              <tr>
                <td style="padding:32px 36px;background:linear-gradient(135deg,${kind === '2h' ? '#92400e 0%,#78350f 100%' : '#1e3a8a 0%,#1e1b4b 100%'});border-bottom:1px solid rgba(255,255,255,0.1);">
                  <div style="display:inline-block;padding:6px 14px;background:rgba(59,130,246,0.2);border:1px solid rgba(96,165,250,0.4);border-radius:100px;color:#93c5fd;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                    Interview ${kind === '2h' ? 'Starting Soon' : 'Reminder'}
                  </div>
                  <h1 style="margin:14px 0 4px 0;color:#ffffff;font-size:22px;font-weight:800;">Your interview is ${countdown}</h1>
                  <p style="margin:0;color:#cbd5e1;font-size:12px;">S.P.A.R.K. Interview Scheduler</p>
                </td>
              </tr>
              <tr>
                <td style="padding:36px;">
                  <p style="margin:0 0 16px 0;color:#e2e8f0;font-size:15px;">Hello <strong style="color:#60a5fa;">${userName}</strong>,</p>
                  <p style="margin:0 0 20px 0;color:#94a3b8;font-size:14px;line-height:1.6;">
                    This is a friendly reminder that your interview <strong style="color:#e2e8f0;">${countdown}</strong>:
                  </p>
                  <div style="margin:0 0 20px 0;padding:20px;background:#0b0f19;border:1px solid #1e293b;border-radius:14px;">
                    <div style="color:#e2e8f0;font-size:16px;font-weight:800;">${jobTitle}</div>
                    <div style="color:#94a3b8;font-size:12px;margin:2px 0 14px 0;">${company}</div>
                    <div style="color:#cbd5e1;font-size:13px;margin:4px 0;">🗓 <strong>${whenLabel}</strong> (IST)</div>
                    <div style="color:#cbd5e1;font-size:13px;margin:4px 0;">⏱ ${durationMinutes} minutes</div>
                    <div style="color:#cbd5e1;font-size:13px;margin:4px 0;">📍 ${modeLabel}${mode === 'online' && meetingUrl ? ' — link below' : ''}</div>
                  </div>
                  ${meetingBlock}
                  ${notesBlock}
                  <p style="margin:20px 0 0 0;color:#64748b;font-size:12px;line-height:1.6;">
                    Good luck! Join a few minutes early, test your audio/video, and keep your resume handy.
                  </p>
                </td>
              </tr>
              <tr>
                <td style="padding:20px 36px;background-color:#0b0f19;border-top:1px solid #1e293b;text-align:center;">
                  <p style="margin:0;color:#64748b;font-size:11px;">© ${new Date().getFullYear()} S.P.A.R.K. • Automated interview reminder</p>
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
      from: `"S.P.A.R.K. Interview Scheduler" <${EMAIL_USER}>`,
      to: toEmail,
      subject: `[S.P.A.R.K.] ${kind === '2h' ? '⏰ Starting soon:' : '📅 Reminder:'} your ${company} interview ${countdown}`,
      text: `Hi ${userName}, your interview for ${jobTitle} at ${company} is ${countdown} — ${whenLabel} (IST), ${durationMinutes} min, ${modeLabel}.${meetingUrl ? ` Join: ${meetingUrl}` : ''}${notes ? ` Notes: ${notes}` : ''}`,
      html: htmlContent,
      attachments: ics ? [{ filename: 'interview-invite.ics', content: ics, contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }] : undefined,
    });
    console.log(`[EmailService] Interview ${kind} reminder dispatched to ${toEmail}`);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error(`[EmailService] Failed to send interview ${kind} reminder to ${toEmail}:`, error.message);
    if (process.env.NODE_ENV !== 'production') {
      // Dev fallback (same contract as the OTP emails): an unreachable SMTP
      // server must not block the reminder pipeline locally.
      console.warn(`[EmailService] DEV MODE interview ${kind} reminder for ${toEmail}: ${jobTitle} @ ${company}, ${scheduledAt} (${mode})${meetingUrl ? ` — ${meetingUrl}` : ''}`);
      return { success: true, error: `SMTP unavailable — dev fallback active (${error.message})` };
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
