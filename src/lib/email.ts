import { Resend } from 'resend';
import type { VaultType } from './vault/types';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const VAULT_TYPE_LABELS: Record<VaultType, string> = {
  family: 'Family Wallet',
  company: 'Company Treasury',
  escrow: 'Escrow Protocol',
  inheritance: 'Inheritance Vault',
  dao: 'DAO Treasury',
  trade: 'Trade Settlement',
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  signer: 'hold a key share and approve actions',
  requester: 'request spending from the vault',
  owner: 'manage the vault and approve actions',
  executor: 'activate the vault if the owner becomes unavailable',
  beneficiary: 'receive funds from the vault',
  arbiter: 'resolve disputes and approve releases',
  council: 'vote on proposals and approve treasury actions',
  viewer: 'view vault activity',
};

// Legacy: keep old function for backward compatibility
export async function sendParentInvitation({
  parentEmail,
  childName,
  inviteToken,
}: {
  parentEmail: string;
  childName: string;
  inviteToken: string;
}) {
  return sendVaultInvitation({
    recipientEmail: parentEmail,
    inviterName: childName,
    inviteToken,
    vaultType: 'family',
    vaultName: `${childName}'s Family Wallet`,
    role: 'signer',
  });
}

export async function sendVaultInvitation({
  recipientEmail,
  inviterName,
  inviteToken,
  vaultType,
  vaultName,
  role,
}: {
  recipientEmail: string;
  inviterName: string;
  inviteToken: string;
  vaultType: VaultType;
  vaultName: string;
  role: string;
}) {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${inviteToken}`;
  const typeLabel = VAULT_TYPE_LABELS[vaultType] || 'Vault';
  const roleDesc = ROLE_DESCRIPTIONS[role] || 'participate in the vault';

  if (!resend) {
    console.log(`[EMAIL] Resend not configured. Invitation URL for ${recipientEmail}:`);
    console.log(`  ${inviteUrl}`);
    return { success: true, fallback: true, inviteUrl };
  }

  try {
    await resend.emails.send({
      from: 'StellaRay Vault <onboarding@resend.dev>',
      to: recipientEmail,
      subject: `${inviterName} invited you to a ${typeLabel}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 0;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 2px; border-radius: 16px;">
            <div style="background: #0a0a0f; border-radius: 14px; padding: 32px;">
              <h2 style="color: #fff; margin: 0 0 8px 0; font-size: 20px;">You've been invited</h2>
              <p style="color: #a1a1aa; margin: 0 0 16px 0; font-size: 14px;">
                <strong style="color: #e4e4e7;">${inviterName}</strong> invited you to join
                <strong style="color: #e4e4e7;">${vaultName}</strong>
              </p>
              <div style="background: #1a1a2e; border-radius: 8px; padding: 12px 16px; margin: 0 0 16px 0;">
                <p style="color: #a78bfa; font-size: 12px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 0.5px;">${typeLabel}</p>
                <p style="color: #e4e4e7; font-size: 13px; margin: 0;">
                  As <strong>${role}</strong>, you'll ${roleDesc} using MPC threshold signing.
                </p>
              </div>
              <p style="color: #a1a1aa; font-size: 13px; margin: 0 0 24px 0;">
                Your key share will be encrypted and stored securely. No single party ever holds the full private key.
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
                This invitation expires in 7 days. Powered by StellaRay Vault Platform.
              </p>
            </div>
          </div>
        </div>
      `,
    });
    return { success: true, fallback: false };
  } catch (error) {
    console.error('[EMAIL] Failed to send:', error);
    console.log(`[EMAIL] Fallback invitation URL for ${recipientEmail}: ${inviteUrl}`);
    return { success: false, fallback: true, inviteUrl };
  }
}
