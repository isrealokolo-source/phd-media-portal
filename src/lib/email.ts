import { Resend } from 'resend';
import { prisma } from './prisma';

const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const DEFAULT_FROM = process.env.EMAIL_FROM || 'PHD Services <noreply@phantomdigital.com.ng>';

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
  const reviewUrl = `${params.appUrl}/admin/releases/${params.releaseId}/review`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d11; color: #f3f4f6; padding: 40px; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1f2430; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #6366f1; margin: 0 0 8px 0; font-size: 22px;">PHD Services — Release Review Required</h2>
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">A new release has been executed by the artist and submitted for administrative approval.</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #9ca3af; width: 180px;">Release Title:</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${params.releaseTitle}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Reference Number:</td><td style="padding: 8px 0; color: #6366f1; font-family: monospace; font-weight: bold;">${params.referenceNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Primary Artist:</td><td style="padding: 8px 0; color: #ffffff;">${params.artistName}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Track Count:</td><td style="padding: 8px 0; color: #ffffff;">${params.trackCount}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Planned Release Date:</td><td style="padding: 8px 0; color: #ffffff;">${params.plannedReleaseDate || 'TBD'}</td></tr>
      </table>
      <div style="margin: 32px 0;">
        <a href="${reviewUrl}" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Open Release Review Console
        </a>
      </div>
      <p style="color: #6b7280; font-size: 12px; margin-top: 32px; border-top: 1px solid #1f2430; padding-top: 16px;">
        This is an automated notification from the PHD Services Release Management Portal.
      </p>
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
  releaseId: string;
  appUrl: string;
}) {
  const editUrl = `${params.appUrl}/artist/releases/${params.releaseId}/edit`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d11; color: #f3f4f6; padding: 40px; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1f2430; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #f59e0b; margin: 0 0 8px 0; font-size: 22px;">Action Required — Release Revision Requested</h2>
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">PHD Services has reviewed your release submission and requested revisions.</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #9ca3af; width: 180px;">Release Title:</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${params.releaseTitle}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Reference Number:</td><td style="padding: 8px 0; color: #f59e0b; font-family: monospace; font-weight: bold;">${params.referenceNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Sections Requiring Action:</td><td style="padding: 8px 0; color: #ffffff;">${params.sections.join(', ')}</td></tr>
      </table>
      <div style="background-color: #1a1f2b; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0; color: #f59e0b;">Administrative Feedback:</h4>
        <p style="margin: 0; color: #e5e7eb; white-space: pre-line;">${params.comments}</p>
      </div>
      <div style="margin: 32px 0;">
        <a href="${editUrl}" style="background-color: #f59e0b; color: #000000; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Resume Editing & Resubmit
        </a>
      </div>
      <p style="color: #6b7280; font-size: 12px; margin-top: 32px; border-top: 1px solid #1f2430; padding-top: 16px;">
        Please make the requested adjustments and resubmit your release for final approval and countersigning.
      </p>
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
  const releaseUrl = `${params.appUrl}/artist/releases/${params.releaseId}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d11; color: #f3f4f6; padding: 40px; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1f2430; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #10b981; margin: 0 0 8px 0; font-size: 22px;">Congratulations! Release Approved & Executed</h2>
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">Your release has been approved and countersigned by PHD Services. Schedules A & B are now fully executed.</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #9ca3af; width: 180px;">Release Title:</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${params.releaseTitle}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Reference Number:</td><td style="padding: 8px 0; color: #10b981; font-family: monospace; font-weight: bold;">${params.referenceNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Planned Release Date:</td><td style="padding: 8px 0; color: #ffffff;">${params.plannedReleaseDate || 'Confirmed with Operations'}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Tracklist:</td><td style="padding: 8px 0; color: #ffffff;">${params.tracks.join(', ')}</td></tr>
      </table>
      <div style="margin: 32px 0;">
        <a href="${releaseUrl}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View Executed Release & Download PDFs
        </a>
      </div>
      <p style="color: #6b7280; font-size: 12px; margin-top: 32px; border-top: 1px solid #1f2430; padding-top: 16px;">
        Official digitally signed and SHA-256 verified copies of Schedule A (Master Register) and Schedule B (Rights Clearance Register) are stored in your artist vault.
      </p>
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
  const releaseUrl = `${params.appUrl}/artist/releases/${params.releaseId}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d11; color: #f3f4f6; padding: 40px; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1f2430; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #ef4444; margin: 0 0 8px 0; font-size: 22px;">Notice — Release Placed On Hold</h2>
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">Your release submission [${params.referenceNumber}] has been placed on administrative hold.</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #9ca3af; width: 180px;">Release Title:</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${params.releaseTitle}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Reference Number:</td><td style="padding: 8px 0; color: #ef4444; font-family: monospace; font-weight: bold;">${params.referenceNumber}</td></tr>
      </table>
      <div style="background-color: #1a1f2b; border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px;">
        <h4 style="margin: 0 0 8px 0; color: #ef4444;">Reason for Hold:</h4>
        <p style="margin: 0; color: #e5e7eb; white-space: pre-line;">${params.reason}</p>
      </div>
      <div style="margin: 32px 0;">
        <a href="${releaseUrl}" style="background-color: #29303e; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View Release Status
        </a>
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
  const loginTime = new Date().toUTCString();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d11; color: #f3f4f6; padding: 40px; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1f2430; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #6366f1; margin: 0 0 8px 0; font-size: 20px;">PHD Services — Security Alert: Account Sign-In</h2>
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">Hello ${params.userName}, a successful sign-in to your PHD Services account was just recorded.</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #9ca3af; width: 160px;">Account Role:</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${params.role.replace(/_/g, ' ')}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Sign-In Timestamp:</td><td style="padding: 8px 0; color: #ffffff;">${loginTime}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">IP Address:</td><td style="padding: 8px 0; color: #6366f1; font-family: monospace;">${params.ipAddress}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Client Device / App:</td><td style="padding: 8px 0; color: #d1d5db; font-size: 12px;">${params.userAgent}</td></tr>
      </table>
      <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
        If you initiated this sign-in, no further action is necessary. If you did not authorize this login, please contact PHD Operations immediately to secure your account.
      </p>
      <div style="margin: 24px 0;">
        <a href="${params.appUrl}" style="background-color: #1e2433; color: #c7d2fe; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-size: 13px; display: inline-block; border: 1px solid #374151;">
          Access Portal
        </a>
      </div>
      <p style="color: #6b7280; font-size: 11px; margin-top: 24px; border-top: 1px solid #1f2430; padding-top: 16px;">
        PHD Services Release Management & Rights Clearance System. Automated Security Notification.
      </p>
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
  const loginUrl = `${params.appUrl}/login`;
  const roleName = params.role.replace(/_/g, ' ');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d11; color: #f3f4f6; padding: 40px; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1f2430; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #6366f1; margin: 0 0 8px 0; font-size: 22px;">Welcome to PHD Services Portal</h2>
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">An authorized account has been provisioned for you by the Super Administrator.</p>
      </div>
      <p style="color: #e5e7eb; font-size: 14px; margin-bottom: 16px;">
        Hello <strong>${params.name}</strong>, you have been invited as a <strong>${roleName}</strong> on the PHD Services Release Management & Rights Clearance Portal.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background-color: #12151b; border-radius: 6px; padding: 16px;">
        <tr><td style="padding: 10px 16px; color: #9ca3af; width: 160px;">Login Email:</td><td style="padding: 10px 16px; color: #ffffff; font-family: monospace; font-weight: bold;">${params.toEmail}</td></tr>
        <tr><td style="padding: 10px 16px; color: #9ca3af;">Assigned Role:</td><td style="padding: 10px 16px; color: #6366f1; font-weight: 600;">${roleName}</td></tr>
        ${
          params.tempPassword
            ? `<tr><td style="padding: 10px 16px; color: #9ca3af;">Initial Password:</td><td style="padding: 10px 16px; color: #10b981; font-family: monospace; font-weight: bold;">${params.tempPassword}</td></tr>`
            : ''
        }
      </table>
      <div style="margin: 32px 0;">
        <a href="${loginUrl}" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Sign In to Portal
        </a>
      </div>
      <p style="color: #9ca3af; font-size: 12px;">
        For security, we recommend updating your password immediately after your initial sign-in.
      </p>
      <p style="color: #6b7280; font-size: 11px; margin-top: 32px; border-top: 1px solid #1f2430; padding-top: 16px;">
        PHD Services Ltd. Official Platform Provisioning Notice.
      </p>
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
  const releaseUrl = `${params.appUrl}/artist/releases/${params.releaseId}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d11; color: #f3f4f6; padding: 40px; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1f2430; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #6366f1; margin: 0 0 8px 0; font-size: 22px;">Submission Received — Legal Review Underway</h2>
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">Hello ${params.artistName}, your release has been successfully submitted to PHD Services.</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #9ca3af; width: 180px;">Release Title:</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${params.releaseTitle}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Reference Number:</td><td style="padding: 8px 0; color: #6366f1; font-family: monospace; font-weight: bold;">${params.referenceNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Tracks Submitted:</td><td style="padding: 8px 0; color: #ffffff;">${params.trackCount}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Planned Release Date:</td><td style="padding: 8px 0; color: #ffffff;">${params.plannedReleaseDate || 'TBD'}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Status:</td><td style="padding: 8px 0; color: #f59e0b; font-weight: 600;">Pending Legal & Clearance Inspection</td></tr>
      </table>
      <p style="color: #9ca3af; font-size: 13px; line-height: 1.5;">
        Your digital signatures on Schedule A (Master Register) and Schedule B (Rights Clearance Register) have been cryptographically stamped. The release record is now locked against unilateral alterations while PHD reviews your deliverables, ownership percentages, and rights documentation.
      </p>
      <div style="margin: 28px 0;">
        <a href="${releaseUrl}" style="background-color: #6366f1; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View Submission Status
        </a>
      </div>
      <p style="color: #6b7280; font-size: 11px; margin-top: 28px; border-top: 1px solid #1f2430; padding-top: 16px;">
        You will receive an automated email notification as soon as PHD approves your submission or requests any revision.
      </p>
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
  const reviewUrl = `${params.appUrl}/admin/releases/${params.releaseId}/review`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d11; color: #f3f4f6; padding: 40px; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1f2430; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #3b82f6; margin: 0 0 8px 0; font-size: 22px;">Notice: Release Resubmitted for Final Review</h2>
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">The artist has addressed the requested revisions and resubmitted the release package.</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #9ca3af; width: 180px;">Release Title:</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${params.releaseTitle}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Reference Number:</td><td style="padding: 8px 0; color: #3b82f6; font-family: monospace; font-weight: bold;">${params.referenceNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Artist:</td><td style="padding: 8px 0; color: #ffffff;">${params.artistName}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Status:</td><td style="padding: 8px 0; color: #3b82f6; font-weight: 600;">RESUBMITTED (Ready for Countersigning)</td></tr>
      </table>
      <div style="margin: 32px 0;">
        <a href="${reviewUrl}" style="background-color: #3b82f6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          Open Review Console & Countersign
        </a>
      </div>
      <p style="color: #6b7280; font-size: 11px; margin-top: 32px; border-top: 1px solid #1f2430; padding-top: 16px;">
        PHD Services Legal & Operations Notification Engine.
      </p>
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
  const reviewUrl = `${params.appUrl}/admin/releases/${params.releaseId}/review`;
  const executionTime = new Date().toUTCString();
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0d11; color: #f3f4f6; padding: 40px; border-radius: 8px;">
      <div style="border-bottom: 1px solid #1f2430; padding-bottom: 20px; margin-bottom: 24px;">
        <h2 style="color: #10b981; margin: 0 0 8px 0; font-size: 22px;">Release Fully Executed & Sealed</h2>
        <p style="color: #9ca3af; margin: 0; font-size: 14px;">Schedules A & B have been legally executed by both parties and sealed in the vault.</p>
      </div>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        <tr><td style="padding: 8px 0; color: #9ca3af; width: 180px;">Release Title:</td><td style="padding: 8px 0; color: #ffffff; font-weight: 600;">${params.releaseTitle}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Reference Number:</td><td style="padding: 8px 0; color: #10b981; font-family: monospace; font-weight: bold;">${params.referenceNumber}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Primary Artist:</td><td style="padding: 8px 0; color: #ffffff;">${params.artistName}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">PHD Countersigner:</td><td style="padding: 8px 0; color: #ffffff;">${params.representativeName} (${params.position})</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">Execution Timestamp:</td><td style="padding: 8px 0; color: #ffffff;">${executionTime}</td></tr>
        <tr><td style="padding: 8px 0; color: #9ca3af;">SHA-256 Seal Hash:</td><td style="padding: 8px 0; color: #10b981; font-family: monospace; font-size: 11px;">${params.documentHash}</td></tr>
      </table>
      <div style="margin: 32px 0;">
        <a href="${reviewUrl}" style="background-color: #10b981; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">
          View Sealed Executed Agreement
        </a>
      </div>
      <p style="color: #6b7280; font-size: 11px; margin-top: 32px; border-top: 1px solid #1f2430; padding-top: 16px;">
        Automated confirmation for PHD Administrative Archive and Executive Records.
      </p>
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

