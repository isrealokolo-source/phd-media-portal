import { Resend } from 'resend';
import { prisma } from './prisma';

export const DEFAULT_APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || 'https://media.phantomdigital.com.ng'
).replace(/\/+$/, '');

function resolveUrl(appUrl?: string): string {
  if (!appUrl) return DEFAULT_APP_URL;
  const trimmed = appUrl.trim().replace(/\/+$/, '');
  // Disallow localhost or dev render domain in outgoing emails
  if (
    trimmed.includes('localhost') ||
    trimmed.includes('phd-media-portal.onrender.com')
  ) {
    return DEFAULT_APP_URL;
  }
  return trimmed || DEFAULT_APP_URL;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  releaseId?: string;
  templateType:
    | 'SUBMISSION'
    | 'SUBMISSION_RECEIPT'
    | 'REVISION_REQUEST'
    | 'RESUBMISSION'
    | 'EXECUTION'
    | 'EXECUTION_ADMIN'
    | 'ON_HOLD'
    | 'LOGIN_ALERT'
    | 'USER_INVITATION'
    | string;
}

export async function sendNotificationEmail(options: SendEmailOptions): Promise<{ success: boolean; id?: string; error?: string }> {
  const { to, subject, html, releaseId, templateType } = options;

  try {
    const apiKey = process.env.RESEND_API_KEY;
    const client = apiKey ? new Resend(apiKey) : null;
    const fromAddress = process.env.EMAIL_FROM || 'PHD Services <noreply@phantomdigital.com.ng>';

    let messageId = `sim_${Date.now()}`;
    let deliveryStatus = 'SENT';
    let details = 'Simulated delivery (No Resend API Key configured)';

    if (client) {
      const response = await client.emails.send({
        from: fromAddress,
        to,
        subject,
        html,
      });

      if (response.error) {
        deliveryStatus = 'FAILED';
        details = `Resend Error: ${response.error.message}`;
        await prisma.emailNotification.create({
          data: {
            releaseId,
            recipientEmail: to,
            subject,
            templateType,
            status: 'FAILED',
            deliveryDetails: details,
          },
        });
        return { success: false, error: response.error.message };
      }

      messageId = response.data?.id || messageId;
      details = `Delivered via Resend. ID: ${messageId}`;
    } else {
      console.log(`\n================== [EMAIL SIMULATION] ==================`);
      console.log(`TO: ${to}`);
      console.log(`SUBJECT: ${subject}`);
      console.log(`TEMPLATE: ${templateType}`);
      console.log(`========================================================\n`);
    }

    await prisma.emailNotification.create({
      data: {
        releaseId,
        recipientEmail: to,
        subject,
        templateType,
        status: deliveryStatus,
        deliveryDetails: details,
      },
    });

    return { success: true, id: messageId };
  } catch (err: any) {
    console.error('Failed to send email:', err);
    await prisma.emailNotification.create({
      data: {
        releaseId,
        recipientEmail: to,
        subject,
        templateType,
        status: 'FAILED',
        deliveryDetails: err?.message || 'Unknown network error',
      },
    });
    return { success: false, error: err?.message || 'Email delivery failed' };
  }
}

// 1. Artist submission notification to PHD Admin
export async function sendArtistSubmissionEmail(params: {
  adminEmail: string;
  artistName: string;
  releaseTitle: string;
  referenceNumber: string;
  plannedReleaseDate?: string;
  trackCount: number;
  releaseId: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const reviewUrl = `${baseUrl}/admin/releases/${params.releaseId}/review`;
  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 8px;">PHD SERVICES &bull; RELEASE OPERATIONS</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Release Review Required</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">A new release package has been executed by the artist and submitted for administrative approval and countersigning.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777; width: 170px;">Release Title:</td><td style="padding: 10px 0; color: #171717; font-weight: 600;">${params.releaseTitle}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Reference Number:</td><td style="padding: 10px 0; color: #171717; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.referenceNumber}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Primary Artist:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.artistName}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Track Count:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.trackCount}</td></tr>
          <tr><td style="padding: 10px 0; color: #777777;">Planned Release Date:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.plannedReleaseDate || 'TBD'}</td></tr>
        </table>
        <div style="margin: 28px 0 20px 0;">
          <a href="${reviewUrl}" style="background-color: #171717; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            Open Review Console
          </a>
        </div>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          PHD Services Release Management Portal &bull; Automated Operations Dispatcher &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.adminEmail,
    subject: `New Release Submission – ${params.releaseTitle} – [${params.referenceNumber}]`,
    html,
    releaseId: params.releaseId,
    templateType: 'SUBMISSION',
  });
}

// 2. Revision request notification to Artist
export async function sendRevisionRequestEmail(params: {
  artistEmail: string;
  artistName: string;
  releaseTitle: string;
  referenceNumber: string;
  comments: string;
  sections: string[];
  requestedDocuments?: string[];
  releaseId: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const editUrl = `${baseUrl}/artist/releases/${params.releaseId}/edit`;
  const requestedDocsHtml = params.requestedDocuments && params.requestedDocuments.length > 0
    ? `
      <div style="background-color: #FFFBEB; border-left: 3px solid #D69E36; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0; color: #92400E; font-size: 13px; font-weight: 600;">Specific Documentation / Rights Clearances Required:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #78350F; font-size: 13px; line-height: 1.5;">
          ${params.requestedDocuments.map((doc) => `<li style="padding: 3px 0;"><strong>${doc}</strong></li>`).join('')}
        </ul>
        <p style="margin: 10px 0 0 0; color: #92400E; font-size: 11px;">You can upload clearances (in PDF format) or download standard templates directly in Step 3 of your release portal.</p>
      </div>
    `
    : '';

  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #D69E36; margin-bottom: 8px;">ACTION REQUIRED &bull; REVISION REQUESTED</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Action Required on Your Release Submission</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">PHD Services operations team has reviewed your submission and requested adjustments before countersigning.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777; width: 170px;">Release Title:</td><td style="padding: 10px 0; color: #171717; font-weight: 600;">${params.releaseTitle}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Reference Number:</td><td style="padding: 10px 0; color: #171717; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.referenceNumber}</td></tr>
          <tr><td style="padding: 10px 0; color: #777777;">Sections Requiring Action:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.sections.join(', ')}</td></tr>
        </table>
        ${requestedDocsHtml}
        <div style="background-color: #F4F4F2; border-left: 3px solid #171717; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
          <h4 style="margin: 0 0 6px 0; color: #171717; font-size: 13px; font-weight: 600;">Reviewer Comments:</h4>
          <p style="margin: 0; color: #404040; white-space: pre-line; font-size: 13px; line-height: 1.5;">${params.comments}</p>
        </div>
        <div style="margin: 28px 0 20px 0;">
          <a href="${editUrl}" style="background-color: #171717; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            Edit Release & Resubmit
          </a>
        </div>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          PHD Services Release Management Portal &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.artistEmail,
    subject: `Action Required – Release Revision – [${params.referenceNumber}]`,
    html,
    releaseId: params.releaseId,
    templateType: 'REVISION_REQUEST',
  });
}

// 3. Execution confirmation notification to Artist
export async function sendReleaseExecutionEmail(params: {
  artistEmail: string;
  artistName: string;
  releaseTitle: string;
  referenceNumber: string;
  plannedReleaseDate?: string;
  tracks: string[];
  releaseId: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const releaseUrl = `${baseUrl}/artist/releases/${params.releaseId}`;
  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #269568; margin-bottom: 8px;">APPROVAL &bull; FULLY EXECUTED</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Release Approved and Countersigned</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">Your release package has been approved and countersigned by PHD Services. Schedules A & B are now fully executed.</p>
        </div>
        <div style="background-color: #F0FDF4; border-left: 3px solid #269568; padding: 14px 16px; margin-bottom: 20px; border-radius: 4px;">
          <p style="margin: 0; color: #166534; font-size: 13px; line-height: 1.5;">
            Official digitally signed and SHA-256 verified copies of Schedule A (Master Register) and Schedule B (Rights Clearance Register) are stored in your artist vault.
          </p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777; width: 170px;">Release Title:</td><td style="padding: 10px 0; color: #171717; font-weight: 600;">${params.releaseTitle}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Reference Number:</td><td style="padding: 10px 0; color: #171717; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.referenceNumber}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Planned Release Date:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.plannedReleaseDate || 'Confirmed with Operations'}</td></tr>
          <tr><td style="padding: 10px 0; color: #777777;">Tracklist:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.tracks.join(', ')}</td></tr>
        </table>
        <div style="margin: 28px 0 20px 0;">
          <a href="${releaseUrl}" style="background-color: #171717; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            View Executed Release & Download PDFs
          </a>
        </div>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          PHD Services Release Management Portal &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.artistEmail,
    subject: `Release Approved and Executed – ${params.releaseTitle} – [${params.referenceNumber}]`,
    html,
    releaseId: params.releaseId,
    templateType: 'EXECUTION',
  });
}

// 4. On Hold notification to Artist
export async function sendReleaseOnHoldEmail(params: {
  artistEmail: string;
  artistName: string;
  releaseTitle: string;
  referenceNumber: string;
  reason: string;
  releaseId: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const releaseUrl = `${baseUrl}/artist/releases/${params.releaseId}`;
  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #D64B4B; margin-bottom: 8px;">ADMINISTRATIVE HOLD NOTICE</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Release Placed On Hold</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">Your release submission [${params.referenceNumber}] has been placed on administrative hold.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777; width: 170px;">Release Title:</td><td style="padding: 10px 0; color: #171717; font-weight: 600;">${params.releaseTitle}</td></tr>
          <tr><td style="padding: 10px 0; color: #777777;">Reference Number:</td><td style="padding: 10px 0; color: #171717; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.referenceNumber}</td></tr>
        </table>
        <div style="background-color: #FEF2F2; border-left: 3px solid #D64B4B; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
          <h4 style="margin: 0 0 6px 0; color: #991B1B; font-size: 13px; font-weight: 600;">Reason for Administrative Hold:</h4>
          <p style="margin: 0; color: #7F1D1D; white-space: pre-line; font-size: 13px; line-height: 1.5;">${params.reason}</p>
        </div>
        <div style="margin: 28px 0 20px 0;">
          <a href="${releaseUrl}" style="background-color: #171717; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            View Release Details
          </a>
        </div>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          PHD Services Release Management Portal &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.artistEmail,
    subject: `Notice: Release On Hold – [${params.referenceNumber}]`,
    html,
    releaseId: params.releaseId,
    templateType: 'ON_HOLD',
  });
}

// 5. User Login Security Alert Email
export async function sendLoginAlertEmail(params: {
  userEmail: string;
  userName: string;
  role: string;
  ipAddress: string;
  userAgent: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const loginTime = new Date().toUTCString();
  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 8px;">SECURITY NOTICE &bull; SIGN-IN ACTIVITY</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Successful Sign-In to Your Account</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">Hello ${params.userName}, a successful sign-in to your PHD Services account was just registered.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777; width: 160px;">Account Role:</td><td style="padding: 10px 0; color: #171717; font-weight: 600;">${params.role.replace(/_/g, ' ')}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Sign-In Timestamp:</td><td style="padding: 10px 0; color: #171717;">${loginTime}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">IP Address:</td><td style="padding: 10px 0; color: #171717; font-family: 'Geist Mono', monospace;">${params.ipAddress}</td></tr>
          <tr><td style="padding: 10px 0; color: #777777;">Client Device:</td><td style="padding: 10px 0; color: #777777; font-size: 12px;">${params.userAgent}</td></tr>
        </table>
        <p style="color: #777777; font-size: 12px; line-height: 1.5;">
          If you initiated this sign-in, no further action is necessary. If you did not authorize this login, please notify PHD Operations immediately.
        </p>
        <div style="margin: 24px 0 16px 0;">
          <a href="${baseUrl}" style="background-color: #171717; color: #FFFFFF; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; display: inline-block;">
            Open Portal
          </a>
        </div>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          PHD Services Release Management & Rights Clearance System &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.userEmail,
    subject: `Security Notice: Successful Sign-In to PHD Portal`,
    html,
    templateType: 'LOGIN_ALERT',
  });
}

// 6. User Account Created / Invitation Email
export async function sendUserInvitationEmail(params: {
  toEmail: string;
  name: string;
  role: string;
  tempPassword?: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const loginUrl = `${baseUrl}/login`;
  const roleName = params.role.replace(/_/g, ' ');

  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 8px;">PHD SERVICES &bull; ACCESS PROVISIONED</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Welcome to PHD Services Portal</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">An authorized account has been provisioned for you by the Super Administrator.</p>
        </div>
        <p style="color: #171717; font-size: 13px; margin-bottom: 16px; line-height: 1.5;">
          Hello <strong>${params.name}</strong>, you have been invited as a <strong>${roleName}</strong> on the PHD Services Release Management & Rights Clearance Portal.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background-color: #F4F4F2; border-radius: 6px; padding: 16px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #E8E8E8;"><td style="padding: 10px 16px; color: #777777; width: 160px;">Login Email:</td><td style="padding: 10px 16px; color: #171717; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.toEmail}</td></tr>
          <tr style="border-bottom: 1px solid #E8E8E8;"><td style="padding: 10px 16px; color: #777777;">Assigned Role:</td><td style="padding: 10px 16px; color: #171717; font-weight: 600;">${roleName}</td></tr>
          ${
            params.tempPassword
              ? `<tr><td style="padding: 10px 16px; color: #777777;">Initial Password:</td><td style="padding: 10px 16px; color: #269568; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.tempPassword}</td></tr>`
              : ''
          }
        </table>
        <div style="margin: 28px 0 20px 0;">
          <a href="${loginUrl}" style="background-color: #171717; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            Sign In to Portal
          </a>
        </div>
        <p style="color: #777777; font-size: 12px; line-height: 1.5;">
          For security, we recommend updating your password after your initial sign-in.
        </p>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          PHD Services Ltd. Official Platform Provisioning Notice &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.toEmail,
    subject: `Account Created: Access Granted to PHD Services Portal (${roleName})`,
    html,
    templateType: 'USER_INVITATION',
  });
}

// 7. Artist Release Submission Receipt Email
export async function sendArtistSubmissionReceiptEmail(params: {
  artistEmail: string;
  artistName: string;
  releaseTitle: string;
  referenceNumber: string;
  trackCount: number;
  plannedReleaseDate?: string;
  releaseId: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const releaseUrl = `${baseUrl}/artist/releases/${params.releaseId}`;
  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 8px;">SUBMISSION CONFIRMATION &bull; LEGAL REVIEW UNDERWAY</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Release Submission Received</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">Hello ${params.artistName}, your release has been successfully submitted to PHD Services.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777; width: 170px;">Release Title:</td><td style="padding: 10px 0; color: #171717; font-weight: 600;">${params.releaseTitle}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Reference Number:</td><td style="padding: 10px 0; color: #171717; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.referenceNumber}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Tracks Submitted:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.trackCount}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Planned Release Date:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.plannedReleaseDate || 'TBD'}</td></tr>
          <tr><td style="padding: 10px 0; color: #777777;">Status:</td><td style="padding: 10px 0; color: #D69E36; font-weight: 600;">Pending Legal & Clearance Inspection</td></tr>
        </table>
        <p style="color: #777777; font-size: 12px; line-height: 1.6;">
          Your digital signatures on Schedule A (Master Register) and Schedule B (Rights Clearance Register) have been cryptographically stamped. The release record is now locked against unilateral alterations while PHD reviews your deliverables, ownership percentages, and rights documentation.
        </p>
        <div style="margin: 28px 0 20px 0;">
          <a href="${releaseUrl}" style="background-color: #171717; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            View Submission Status
          </a>
        </div>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          PHD Services Release Management Portal &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.artistEmail,
    subject: `Submission Receipt: ${params.releaseTitle} [${params.referenceNumber}]`,
    html,
    releaseId: params.releaseId,
    templateType: 'SUBMISSION_RECEIPT',
  });
}

// 8. Resubmission Notification to PHD Reviewers
export async function sendReleaseResubmittedEmail(params: {
  adminEmail: string;
  artistName: string;
  releaseTitle: string;
  referenceNumber: string;
  releaseId: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const reviewUrl = `${baseUrl}/admin/releases/${params.releaseId}/review`;
  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #2563EB; margin-bottom: 8px;">RESUBMISSION &bull; READY FOR COUNTERSIGNING</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Release Resubmitted for Final Review</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">The artist has addressed the requested revisions and resubmitted the release package.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777; width: 170px;">Release Title:</td><td style="padding: 10px 0; color: #171717; font-weight: 600;">${params.releaseTitle}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Reference Number:</td><td style="padding: 10px 0; color: #171717; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.referenceNumber}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Artist:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.artistName}</td></tr>
          <tr><td style="padding: 10px 0; color: #777777;">Status:</td><td style="padding: 10px 0; color: #2563EB; font-weight: 600;">RESUBMITTED (Ready for Countersigning)</td></tr>
        </table>
        <div style="margin: 28px 0 20px 0;">
          <a href="${reviewUrl}" style="background-color: #171717; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            Open Review Console & Countersign
          </a>
        </div>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          PHD Services Legal & Operations Notification Engine &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.adminEmail,
    subject: `Resubmitted: ${params.releaseTitle} – [${params.referenceNumber}] Ready for Approval`,
    html,
    releaseId: params.releaseId,
    templateType: 'RESUBMISSION',
  });
}

// 9. Admin Execution Confirmation Notification
export async function sendAdminExecutionNotificationEmail(params: {
  adminEmail: string;
  representativeName: string;
  position: string;
  artistName: string;
  releaseTitle: string;
  referenceNumber: string;
  documentHash: string;
  releaseId: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const reviewUrl = `${baseUrl}/admin/releases/${params.releaseId}/review`;
  const executionTime = new Date().toUTCString();
  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #269568; margin-bottom: 8px;">EXECUTION &bull; SEALED & ARCHIVED</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Release Fully Executed & Sealed</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">Schedules A & B have been legally executed by both parties and cryptographically sealed.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777; width: 170px;">Release Title:</td><td style="padding: 10px 0; color: #171717; font-weight: 600;">${params.releaseTitle}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Reference Number:</td><td style="padding: 10px 0; color: #171717; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.referenceNumber}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Primary Artist:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.artistName}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">PHD Countersigner:</td><td style="padding: 10px 0; color: #171717; font-weight: 500;">${params.representativeName} (${params.position})</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Execution Timestamp:</td><td style="padding: 10px 0; color: #171717;">${executionTime}</td></tr>
          <tr><td style="padding: 10px 0; color: #777777;">SHA-256 Seal Hash:</td><td style="padding: 10px 0; color: #171717; font-family: 'Geist Mono', monospace; font-size: 11px;">${params.documentHash}</td></tr>
        </table>
        <div style="margin: 28px 0 20px 0;">
          <a href="${reviewUrl}" style="background-color: #171717; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            View Sealed Executed Agreement
          </a>
        </div>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          Automated confirmation for PHD Administrative Archive and Executive Records &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.adminEmail,
    subject: `Execution Notice: ${params.releaseTitle} [${params.referenceNumber}] Sealed`,
    html,
    releaseId: params.releaseId,
    templateType: 'EXECUTION_ADMIN',
  });
}

// 10. Artist Welcome Onboarding Email
export async function sendArtistWelcomeEmail(params: {
  artistEmail: string;
  artistName: string;
  contractNumber: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const portalUrl = `${baseUrl}/artist`;
  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #171717; margin-bottom: 8px;">PHD SERVICES &bull; ARTIST REGISTRATION</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">Welcome to PHD Services</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">Your artist account has been verified and linked to your distribution agreement.</p>
        </div>
        <p style="color: #171717; font-size: 13px; margin-bottom: 16px; line-height: 1.5;">
          Hello <strong>${params.artistName}</strong>, welcome to the PHD Services Release Management & Rights Clearance Portal. Your account is tied to authorized contract <strong style="font-family: 'Geist Mono', monospace;">${params.contractNumber}</strong>.
        </p>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background-color: #F4F4F2; border-radius: 6px; padding: 16px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #E8E8E8;"><td style="padding: 10px 16px; color: #777777; width: 160px;">Artist Name:</td><td style="padding: 10px 16px; color: #171717; font-weight: 600;">${params.artistName}</td></tr>
          <tr style="border-bottom: 1px solid #E8E8E8;"><td style="padding: 10px 16px; color: #777777;">Account Email:</td><td style="padding: 10px 16px; color: #171717; font-family: 'Geist Mono', monospace;">${params.artistEmail}</td></tr>
          <tr><td style="padding: 10px 16px; color: #777777;">Linked Contract:</td><td style="padding: 10px 16px; color: #269568; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.contractNumber}</td></tr>
        </table>
        <p style="color: #777777; font-size: 12px; line-height: 1.6;">
          You can now register music releases, upload lossless masters and cover artwork, manage split sheet clearances, and monitor distribution approval directly from your dashboard.
        </p>
        <div style="margin: 28px 0 20px 0;">
          <a href="${portalUrl}" style="background-color: #171717; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            Access Artist Portal
          </a>
        </div>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          PHD Services Release Management & Rights Clearance Engine &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.artistEmail,
    subject: `Welcome to PHD Services – Account Verified [${params.contractNumber}]`,
    html,
    templateType: 'ARTIST_WELCOME',
  });
}

// 11. New Artist Registration Notification to PHD Operations
export async function sendNewArtistRegistrationAdminAlertEmail(params: {
  adminEmail: string;
  artistName: string;
  artistEmail: string;
  contractNumber: string;
  appUrl: string;
}) {
  const baseUrl = resolveUrl(params.appUrl);
  const adminUrl = `${baseUrl}/admin/contracts`;
  const html = `
    <div style="background-color: #F4F4F2; padding: 40px 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E8E8E8; border-radius: 8px; padding: 36px 32px;">
        <div style="border-bottom: 1px solid #E8E8E8; padding-bottom: 20px; margin-bottom: 24px;">
          <div style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #269568; margin-bottom: 8px;">ADMINISTRATIVE ALERT &bull; ARTIST CLAIMED CONTRACT</div>
          <h2 style="color: #171717; margin: 0 0 6px 0; font-size: 20px; font-weight: 700; letter-spacing: -0.01em;">New Artist Registration Verified</h2>
          <p style="color: #777777; margin: 0; font-size: 13px; line-height: 1.5;">An artist has registered and successfully claimed their authorized contract.</p>
        </div>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777; width: 170px;">Artist Name:</td><td style="padding: 10px 0; color: #171717; font-weight: 600;">${params.artistName}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Registered Email:</td><td style="padding: 10px 0; color: #171717; font-family: 'Geist Mono', monospace;">${params.artistEmail}</td></tr>
          <tr style="border-bottom: 1px solid #F4F4F2;"><td style="padding: 10px 0; color: #777777;">Claimed Contract:</td><td style="padding: 10px 0; color: #269568; font-family: 'Geist Mono', monospace; font-weight: 700;">${params.contractNumber}</td></tr>
          <tr><td style="padding: 10px 0; color: #777777;">Timestamp:</td><td style="padding: 10px 0; color: #171717;">${new Date().toUTCString()}</td></tr>
        </table>
        <div style="margin: 28px 0 20px 0;">
          <a href="${adminUrl}" style="background-color: #171717; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px; display: inline-block;">
            View Contracts Console
          </a>
        </div>
        <p style="color: #999999; font-size: 11px; margin-top: 32px; border-top: 1px solid #E8E8E8; padding-top: 16px; line-height: 1.5;">
          PHD Services Administrative Operations Dispatcher &bull; <a href="https://media.phantomdigital.com.ng" style="color: #777777; text-decoration: underline;">media.phantomdigital.com.ng</a>
        </p>
      </div>
    </div>
  `;

  return sendNotificationEmail({
    to: params.adminEmail,
    subject: `New Artist Registered: ${params.artistName} [${params.contractNumber}]`,
    html,
    templateType: 'ADMIN_ARTIST_REGISTERED',
  });
}
