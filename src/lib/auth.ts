import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/options';
import { sql, ensureSchema } from './db';

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return null;

  await ensureSchema();

  const rows = await sql`
    SELECT * FROM guardian_users WHERE email = ${session.user.email}
  `;

  if (rows[0]) return rows[0];

  // User has a valid Google session but no DB record (e.g. signed in before tables existed).
  // Auto-create the record now.
  const created = await sql`
    INSERT INTO guardian_users (email, name, image)
    VALUES (${session.user.email}, ${session.user.name || ''}, ${session.user.image || ''})
    ON CONFLICT (email) DO UPDATE SET
      name = EXCLUDED.name,
      image = EXCLUDED.image,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
  `;
  return created[0] || null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

export async function getUserFamily(userId: string) {
  const rows = await sql`
    SELECT f.*, m.role as member_role, m.status as member_status, m.id as member_id
    FROM guardian_families f
    JOIN guardian_members m ON m.family_id = f.id
    WHERE m.user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] || null;
}

export type UserState =
  | 'no_family'
  | 'pending_parents'
  | 'active_child'
  | 'active_parent'
  | 'invited_parent';

export async function getUserState(userId: string): Promise<{
  state: UserState;
  family?: Record<string, unknown>;
  role?: string;
}> {
  const familyRow = await getUserFamily(userId);

  if (!familyRow) {
    // Check if they have a pending invitation
    const invites = await sql`
      SELECT gm.*, gf.status as family_status
      FROM guardian_members gm
      JOIN guardian_families gf ON gf.id = gm.family_id
      WHERE gm.user_id = ${userId} AND gm.status = 'pending'
      LIMIT 1
    `;
    if (invites[0]) {
      return { state: 'invited_parent' };
    }
    return { state: 'no_family' };
  }

  const { member_role, member_status, ...family } = familyRow;

  if (family.status === 'pending_parents') {
    if (member_role === 'child') {
      return { state: 'pending_parents', family, role: member_role };
    }
    return { state: 'invited_parent', family, role: member_role };
  }

  if (family.status === 'active') {
    if (member_role === 'child') {
      return { state: 'active_child', family, role: member_role };
    }
    return { state: 'active_parent', family, role: member_role };
  }

  return { state: 'no_family' };
}
