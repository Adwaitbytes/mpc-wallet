import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendParentInvitation({
  parentEmail,
  childName,
  inviteToken,
}: {
  parentEmail: string;
  childName: string;
  inviteToken: string;
}) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`;

  if (!resend) {
    console.log(`[EMAIL] Resend not configured. Invitation URL for ${parentEmail}:`);
    console.log(`  ${inviteUrl}`);
    return { success: true, fallback: true, inviteUrl };
  }

  try {
    await resend.emails.send({
      from: 'StellaRay Guardian <onboarding@resend.dev>',
      to: parentEmail,
      subject: `${childName} wants to add you as a guardian on StellaRay`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 2px; border-radius: 16px;">
            <div style="background: #0a0a0f; border-radius: 14px; padding: 32px;">
              <h2 style="color: #fff; margin: 0 0 8px 0; font-size: 20px;">You've been invited</h2>
              <p style="color: #a1a1aa; margin: 0 0 24px 0; font-size: 14px;">
                <strong style="color: #e4e4e7;">${childName}</strong> wants to add you as a guardian on their family wallet.
              </p>
              <p style="color: #a1a1aa; font-size: 13px; margin: 0 0 24px 0;">
                As a guardian, you'll hold one key share of the family vault
                and approve your child's spending requests using MPC threshold signing.
              </p>
              <a href="${inviteUrl}" style="
                display: inline-block;
                background: linear-gradient(to right, #6366f1, #8b5cf6);
                color: white;
                text-decoration: none;
                padding: 12px 32px;
                border-radius: 12px;
                font-weight: 600;
                font-size: 14px;
              ">Accept Invitation</a>
              <p style="color: #52525b; font-size: 11px; margin: 24px 0 0 0;">
                This invitation expires in 7 days. Powered by StellaRay Guardian + Stellar Network.
              </p>
            </div>
          </div>
        </div>
      `,
    });
    return { success: true, fallback: false };
  } catch (error) {
    console.error('[EMAIL] Failed to send:', error);
    console.log(`[EMAIL] Fallback invitation URL for ${parentEmail}: ${inviteUrl}`);
    return { success: false, fallback: true, inviteUrl };
  }
}
