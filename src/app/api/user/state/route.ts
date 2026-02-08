import { NextResponse } from 'next/server';
import { getCurrentUser, getUserState } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ state: 'unauthenticated' }, { status: 401 });
    }

    const result = await getUserState(user.id);
    return NextResponse.json({ ...result, user: { id: user.id, name: user.name, email: user.email } });
  } catch (error) {
    console.error('[API] /user/state error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
