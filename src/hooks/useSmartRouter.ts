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
  | 'invited_parent'
  | 'has_vaults'
  | 'no_vaults';

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

    // Try v2 state first
    fetch('/api/v2/user/state')
      .then((r) => r.json())
      .then((data) => {
        if (data.hasVaults) {
          setUserState('has_vaults');
          // Redirect to dashboard if on old pages
          const oldPages = ['/onboarding', '/status', '/child', '/parent'];
          if (oldPages.includes(pathname)) {
            router.replace('/dashboard');
          }
          return;
        }

        // Fall back to legacy state
        return fetch('/api/user/state')
          .then(r => r.json())
          .then(legacyData => {
            const state: UserState = legacyData.state || 'no_vaults';
            setUserState(state);

            const stateToPath: Record<string, string> = {
              no_family: '/dashboard',
              no_vaults: '/dashboard',
              pending_parents: '/status',
              active_child: '/child',
              active_parent: '/parent',
              invited_parent: '/status',
            };

            const targetPath = stateToPath[state];
            if (targetPath && pathname !== targetPath) {
              if (pathname !== '/auth' && !pathname.startsWith('/invite') && !pathname.startsWith('/vault') && pathname !== '/dashboard') {
                router.replace(targetPath);
              }
            }
          });
      })
      .catch(() => {
        setUserState('no_vaults');
        if (pathname !== '/auth' && !pathname.startsWith('/invite') && !pathname.startsWith('/vault') && pathname !== '/dashboard') {
          router.replace('/dashboard');
        }
      });
  }, [status, pathname, router]);

  return { userState, isLoading: userState === 'loading' || status === 'loading' };
}
