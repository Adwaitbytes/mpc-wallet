/**
 * POST /api/v2/vault/create
 * Create a new vault from a preset
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { ensureSchema } from '@/lib/db';
import { createVault } from '@/lib/vault/engine';
import { sendVaultInvitation } from '@/lib/email';
import { familyPreset } from '@/lib/vault/presets/family';
import { companyPreset } from '@/lib/vault/presets/company';
import { escrowPreset } from '@/lib/vault/presets/escrow';
import { inheritancePreset } from '@/lib/vault/presets/inheritance';
import { daoPreset } from '@/lib/vault/presets/dao';
import { tradePreset } from '@/lib/vault/presets/trade';
import type { CreateVaultInput, VaultType } from '@/lib/vault/types';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    await ensureSchema();

    const body = await request.json();
    const { vaultType, preset, custom } = body as {
      vaultType: VaultType;
      preset?: Record<string, unknown>;
      custom?: CreateVaultInput;
    };

    if (!vaultType) {
      return NextResponse.json({ error: 'vaultType is required' }, { status: 400 });
    }

    let input: CreateVaultInput;

    if (custom) {
      // Custom vault configuration
      input = custom;
    } else if (preset) {
      // Use preset factory
      switch (vaultType) {
        case 'family':
          input = familyPreset({
            childEmail: user.email,
            childName: user.name || 'Child',
            parent1Email: preset.parent1Email as string,
            parent2Email: preset.parent2Email as string,
            allowanceXlm: preset.allowanceXlm as number,
          });
          break;
        case 'company':
          input = companyPreset({
            companyName: preset.companyName as string || 'Company',
            ownerEmail: user.email,
            signerEmails: preset.signerEmails as string[] || [],
            threshold: preset.threshold as number,
            autoApproveBelow: preset.autoApproveBelow as number,
            timeLockAbove: preset.timeLockAbove as number,
            timeLockHours: preset.timeLockHours as number,
          });
          break;
        case 'escrow':
          input = escrowPreset({
            title: preset.title as string || 'Escrow',
            clientEmail: user.email,
            freelancerEmail: preset.freelancerEmail as string,
            arbiterEmail: preset.arbiterEmail as string,
            totalAmount: preset.totalAmount as string,
            milestones: preset.milestones as Array<{ name: string; amount: string }> || [],
            timeoutDays: preset.timeoutDays as number,
          });
          break;
        case 'inheritance':
          input = inheritancePreset({
            ownerEmail: user.email,
            executorEmail: preset.executorEmail as string,
            beneficiaryEmail: preset.beneficiaryEmail as string,
            heartbeatIntervalDays: preset.heartbeatIntervalDays as number,
            executorDelayDays: preset.executorDelayDays as number,
          });
          break;
        case 'dao':
          input = daoPreset({
            daoName: preset.daoName as string || 'DAO',
            councilEmails: [user.email, ...(preset.councilEmails as string[] || [])],
            threshold: preset.threshold as number,
            votingPeriodHours: preset.votingPeriodHours as number,
            quorumPercent: preset.quorumPercent as number,
          });
          break;
        case 'trade':
          input = tradePreset({
            tradeName: preset.tradeName as string || 'Trade',
            importerEmail: user.email,
            exporterEmail: preset.exporterEmail as string,
            bankEmail: preset.bankEmail as string,
            acceptedAssets: preset.acceptedAssets as string[],
            documentRequired: preset.documentRequired as boolean,
          });
          break;
        default:
          return NextResponse.json({ error: `Unknown vault type: ${vaultType}` }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: 'Either preset or custom configuration required' }, { status: 400 });
    }

    // Create the vault
    const vault = await createVault(user.id, input);

    // Send invitations to pending members
    const pendingMembers = vault.members.filter(m => m.status === 'pending' && m.invite_token);
    for (const member of pendingMembers) {
      await sendVaultInvitation({
        recipientEmail: member.email,
        inviterName: user.name || user.email,
        inviteToken: member.invite_token!,
        vaultType: input.vaultType,
        vaultName: input.name,
        role: member.role,
      });
    }

    return NextResponse.json({
      success: true,
      vault: {
        id: vault.id,
        name: vault.name,
        vault_type: vault.vault_type,
        status: vault.status,
        wallet_public_key: vault.wallet_public_key,
        threshold: vault.threshold,
        total_shares: vault.total_shares,
        members: vault.members.map(m => ({
          id: m.id,
          email: m.email,
          role: m.role,
          label: m.label,
          status: m.status,
        })),
      },
      invitesSent: pendingMembers.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[API] /v2/vault/create error:', error);
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Please sign in first' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
