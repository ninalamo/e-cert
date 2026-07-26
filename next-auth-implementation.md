# NextAuth v4 Implementation Plan

## Why Migrate to NextAuth v4?

- **Security**: Handles CSRF, session management, token refresh automatically
- **Maintenance**: Battle-tested, community support, regular updates
- **Features**: Magic links, provider auth (Google/GitHub), email verification
- **Trust**: Users recognize "Sign in with Google" etc.

---

## Prerequisites

### 1. Database Schema Changes

NextAuth requires its own tables. Add to Supabase:

```sql
-- NextAuth required tables
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  refresh_token TEXT,
  access_token TEXT,
  expires_at BIGINT,
  token_type TEXT,
  scope TEXT,
  id_token TEXT,
  session_state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(provider, provider_account_id)
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE verification_tokens (
  identifier TEXT NOT NULL,
  token TEXT NOT NULL,
  expires TIMESTAMP WITH TIME ZONE NOT NULL,
  PRIMARY KEY (identifier, token)
);

-- Add NextAuth fields to users table (optional, for adapter)
ALTER TABLE users ADD COLUMN email_verified TIMESTAMP WITH TIME ZONE;
ALTER TABLE users ADD COLUMN image TEXT;
```

### 2. Install Dependencies

```bash
npm install next-auth @next-auth/prisma-adapter @prisma/client
# Or for Supabase adapter:
npm install next-auth @next-auth/supabase-adapter
```

### 3. Environment Variables

```env
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-here  # Generate with: openssl rand -base64 32
```

---

## Implementation Steps

### Step 1: Create NextAuth Configuration

Create `src/app/api/auth/[...nextauth]/route.ts`:

```typescript
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth/next-auth";

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

### Step 2: Create Auth Options

Create `src/lib/auth/next-auth.ts`:

```typescript
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { SupabaseAdapter } from "@next-auth/supabase-adapter";
import { createClient } from "@supabase/supabase-js";
import { comparePassword } from "@/lib/auth/password";

export const authOptions: NextAuthOptions = {
  adapter: SupabaseAdapter({
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    secret: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  }),
  session: {
    strategy: "jwt",  // Use JWT strategy for simplicity
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: user } = await supabase
          .from("users")
          .select("id, email, name, password_hash, banned_until")
          .eq("email", credentials.email)
          .single();

        if (!user) {
          throw new Error("Invalid credentials");
        }

        if (user.banned_until && new Date(user.banned_until) > new Date()) {
          throw new Error("Account is banned");
        }

        const isValid = await comparePassword(credentials.password, user.password_hash);
        if (!isValid) {
          throw new Error("Invalid credentials");
        }

        // Get user role from memberships
        const { data: membership } = await supabase
          .from("user_memberships")
          .select("role")
          .eq("user_id", user.id)
          .single();

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: membership?.role || "participant",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.sub;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};
```

### Step 3: Update Middleware

Replace `src/proxy.ts` with NextAuth middleware:

```typescript
export { default } from "next-auth/middleware";

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/certificates/:path*",
    "/templates/:path*",
    "/users/:path*",
    "/my/:path*",
  ],
};
```

### Step 4: Update Server-Side Session Access

Replace `src/lib/permissions.ts`:

```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/next-auth";

export async function getCurrentSession() {
  const session = await getServerSession(authOptions);
  return session;
}

export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}
```

### Step 5: Update Client-Side Session Access

Create `src/components/session-provider.tsx`:

```typescript
"use client";

import { SessionProvider } from "next-auth/react";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
```

Wrap app in `src/app/layout.tsx`:

```typescript
import { Providers } from "@/components/session-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

### Step 6: Update Login Action

Replace `src/features/auth/server/auth.actions.ts` login:

```typescript
"use server";

import { signIn, signOut } from "next-auth/react";

export async function loginAction(
  _prev: { error?: string; success?: boolean; redirectTo?: string } | undefined,
  formData: FormData,
) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const result = await signIn("credentials", {
    email,
    password,
    redirect: false,
  });

  if (result?.error) {
    return { error: "Invalid email or password" };
  }

  return { success: true, redirectTo: "/dashboard" };
}

export async function logout() {
  await signOut({ redirect: true, callbackUrl: "/login" });
}
```

### Step 7: Update Client Components

Replace `getCurrentSession()` calls with `useSession()`:

```typescript
"use client";

import { useSession } from "next-auth/react";

export function Sidebar() {
  const { data: session, status } = useSession();
  
  if (status === "loading") return <div>Loading...</div>;
  if (!session) return null;
  
  return (
    <div>
      <p>Welcome, {session.user?.name}</p>
      <p>Role: {(session.user as any)?.role}</p>
    </div>
  );
}
```

---

## Migration Strategy

### Phase 1: Parallel Running (1-2 days)
1. Implement NextAuth alongside current system
2. Keep both login flows working
3. Test thoroughly

### Phase 2: Gradual Migration (3-5 days)
1. Update all `getCurrentSession()` calls to use NextAuth
2. Update all `useSession()` hooks
3. Remove custom JWT logic

### Phase 3: Cleanup (1 day)
1. Remove `src/lib/auth/jwt.ts`, `session.ts`, `tokens.ts`
2. Remove custom proxy middleware
3. Update database schema

---

## Testing Checklist

- [ ] Login with email/password works
- [ ] Session persists across page refreshes
- [ ] Logout works correctly
- [ ] Protected routes redirect to /login when unauthenticated
- [ ] User role is accessible in server components
- [ ] User role is accessible in client components
- [ ] CSRF protection works
- [ ] No redirect loops

---

## Key Differences from Current System

| Feature | Current (Custom JWT) | NextAuth v4 |
|---------|---------------------|-------------|
| Session Management | Manual (cookies) | Automatic |
| CSRF Protection | Custom | Built-in |
| Token Refresh | Custom | Automatic |
| Provider Auth | Not supported | Supported |
| Maintenance | High | Low |
| Security | Manual | Battle-tested |

---

## References

- [NextAuth v4 Docs](https://next-auth.js.org/)
- [NextAuth with Supabase](https://next-auth.js.org/adapters/supabase)
- [NextAuth with Credentials](https://next-auth.js.org/providers/credentials)

---

## Notes

- Keep current system as fallback during migration
- Test thoroughly before removing custom JWT logic
- Consider adding provider auth (Google/GitHub) as a feature upgrade
