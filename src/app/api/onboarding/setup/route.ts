import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { requireAuth } from '@/lib/auth';
import { sql } from '@/lib/db';
import { sendParentInvitation } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { parent1Email, parent2Email, allowanceXlm } = body;

    if (!parent1Email || !parent2Email) {
      return NextResponse.json({ error: 'Both parent emails are required' }, { status: 400 });
    }

    if (parent1Email === parent2Email) {
      return NextResponse.json({ error: 'Parent emails must be different' }, { status: 400 });
    }

    if (parent1Email === user.email || parent2Email === user.email) {
      return NextResponse.json({ error: 'You cannot add yourself as a parent' }, { status: 400 });
    }

    // Check if user already has a family
    const existingFamily = await sql`
      SELECT id FROM guardian_families WHERE child_id = ${user.id}
    `;
    if (existingFamily[0]) {
      return NextResponse.json({ error: 'You already have a family set up' }, { status: 409 });
    }

    // Generate invite tokens
    const token1 = randomBytes(32).toString('hex');
    const token2 = randomBytes(32).toString('hex');
    const allowance = allowanceXlm || 50;

    // Create family
    const familyRows = await sql`
      INSERT INTO guardian_families (child_id, allowance_xlm, status)
      VALUES (${user.id}, ${allowance}, 'pending_parents')
      RETURNING id
    `;
    const familyId = familyRows[0].id;

    // Add child as member (share_index 1)
    await sql`
      INSERT INTO guardian_members (family_id, user_id, email, role, status, share_index)
      VALUES (${familyId}, ${user.id}, ${user.email}, 'child', 'accepted', 1)
    `;

    // Add parent 1 (share_index 2)
    await sql`
      INSERT INTO guardian_members (family_id, email, role, invite_token, status, share_index)
      VALUES (${familyId}, ${parent1Email}, 'parent', ${token1}, 'pending', 2)
    `;

    // Add parent 2 (share_index 3)
    await sql`
      INSERT INTO guardian_members (family_id, email, role, invite_token, status, share_index)
      VALUES (${familyId}, ${parent2Email}, 'parent', ${token2}, 'pending', 3)
    `;

    // Send invitation emails (sequential for better error tracking)
    const childName = user.name || user.email.split('@')[0];
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const inviteUrl1 = `${appUrl}/invite/${token1}`;
    const inviteUrl2 = `${appUrl}/invite/${token2}`;

    const email1Result = await sendParentInvitation({ parentEmail: parent1Email, childName, inviteToken: token1 });
    const email2Result = await sendParentInvitation({ parentEmail: parent2Email, childName, inviteToken: token2 });

    console.log('[ONBOARDING] Invite links generated:');
    console.log(`  Parent 1 (${parent1Email}): ${inviteUrl1}`);
    console.log(`  Parent 2 (${parent2Email}): ${inviteUrl2}`);

    return NextResponse.json({
      success: true,
      familyId,
      invitations: [
        { email: parent1Email, inviteUrl: inviteUrl1, ...email1Result },
        { email: parent2Email, inviteUrl: inviteUrl2, ...email2Result },
      ],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[API] /onboarding/setup error:', error);
    if (message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
