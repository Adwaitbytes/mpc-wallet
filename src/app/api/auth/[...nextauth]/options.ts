import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { sql, ensureSchema } from '@/lib/db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email || account?.provider !== 'google') return false;

      try {
        // Ensure DB tables exist on first sign-in
        await ensureSchema();

        // Upsert user into guardian_users on every sign-in
        await sql`
          INSERT INTO guardian_users (email, name, image, google_sub)
          VALUES (${user.email}, ${user.name || ''}, ${user.image || ''}, ${account.providerAccountId})
          ON CONFLICT (email) DO UPDATE SET
            name = EXCLUDED.name,
            image = EXCLUDED.image,
            google_sub = EXCLUDED.google_sub,
            updated_at = CURRENT_TIMESTAMP
        `;
        return true;
      } catch (error) {
        console.error('[AUTH] DB upsert failed:', error);
        // Still allow sign-in even if DB is temporarily unreachable
        return true;
      }
    },
    async jwt({ token, account }) {
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).sub = token.sub;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
