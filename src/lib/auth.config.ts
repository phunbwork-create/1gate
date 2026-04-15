import type { NextAuthConfig } from "next-auth"

export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnLogin = nextUrl.pathname.startsWith("/login")
      const isOnApi = nextUrl.pathname.startsWith("/api")

      // Allow API requests to pass through (handled by their own auth)
      if (isOnApi) return true

      // If on login page and already logged in, redirect to dashboard
      if (isOnLogin) {
        if (isLoggedIn) return Response.redirect(new URL("/dashboard", nextUrl))
        return true
      }

      // All other pages require auth
      if (!isLoggedIn) return false

      // Admin-only routes: check role from JWT token
      if (nextUrl.pathname.startsWith("/admin")) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const role = (auth as any)?.user?.role
        if (role !== "Admin") {
          return Response.redirect(new URL("/dashboard", nextUrl))
        }
      }

      return true
    },
    // JWT callback to persist custom fields in token — shared with auth.ts
    async jwt({ token, user }) {
      if (user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = user as any
        token.id = u.id
        token.role = u.role
        token.companyId = u.companyId
        token.companyName = u.companyName
        token.companyCode = u.companyCode
        token.companyType = u.companyType
        token.departmentId = u.departmentId
        token.departmentName = u.departmentName
      }
      return token
    },
    // Session callback to expose token data to client
    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = session.user as any
        u.id = token.id
        u.role = token.role
        u.companyId = token.companyId
        u.companyName = token.companyName
        u.companyCode = token.companyCode
        u.companyType = token.companyType
        u.departmentId = token.departmentId
        u.departmentName = token.departmentName
      }
      return session
    },
  },
  providers: [], // Configured in auth.ts
}
