'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';

type UserState =
  | 'loading'
  | 'unauthenticated'
  | 'no_family'
  | 'pending_parents'
  | 'active_child'
  | 'active_parent'
  | 'invited_parent';

export function useSmartRouter() {
  const { status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [userState, setUserState] = useState<UserState>('loading');

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      setUserState('unauthenticated');
      return;
    }

    fetch('/api/user/state')
      .then((r) => r.json())
      .then((data) => {
        const state: UserState = data.state || 'no_family';
        setUserState(state);

        // Smart redirect based on state + current page
        const stateToPath: Record<string, string> = {
          no_family: '/onboarding',
          pending_parents: '/status',
          active_child: '/child',
          active_parent: '/parent',
          invited_parent: '/status',
        };

        const targetPath = stateToPath[state];
        if (targetPath && pathname !== targetPath) {
          // Don't redirect if user is on the auth page or invite page
          if (pathname !== '/auth' && !pathname.startsWith('/invite')) {
            router.replace(targetPath);
          }
        }
      })
      .catch(() => setUserState('no_family'));
  }, [status, pathname, router]);

  return { userState, isLoading: userState === 'loading' || status === 'loading' };
}
