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

      // Admin-only routes: check permission-based access
      if (nextUrl.pathname.startsWith("/admin")) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const user = (auth as any)?.user
        const permissions: string[] = user?.permissions || []
        
        // Allow if user has admin.full or admin.access permission
        if (!permissions.includes("admin.full") && !permissions.includes("admin.access")) {
          // Fallback: check legacy role field
          if (user?.role !== "Admin" && !user?.roles?.includes("Admin")) {
            return Response.redirect(new URL("/dashboard", nextUrl))
          }
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
        // Dynamic RBAC
        token.roles = u.roles || []
        token.permissions = u.permissions || []
        token.primaryRole = u.primaryRole || u.role
        token.primaryRoleDisplay = u.primaryRoleDisplay
        token.primaryRoleColor = u.primaryRoleColor
        token.rolesData = u.rolesData || []
        // Company info
        token.companyId = u.companyId
        token.companyName = u.companyName
        token.companyCode = u.companyCode
        token.companyType = u.companyType
        token.departmentId = u.departmentId
        token.departmentName = u.departmentName
        // Legacy compat
        token.role = u.primaryRole || u.role
      }
      return token
    },
    // Session callback to expose token data to client
    async session({ session, token }) {
      if (session.user) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const u = session.user as any
        u.id = token.id
        // Dynamic RBAC
        u.roles = token.roles
        u.permissions = token.permissions
        u.primaryRole = token.primaryRole
        u.primaryRoleDisplay = token.primaryRoleDisplay
        u.primaryRoleColor = token.primaryRoleColor
        u.rolesData = token.rolesData
        // Company info
        u.companyId = token.companyId
        u.companyName = token.companyName
        u.companyCode = token.companyCode
        u.companyType = token.companyType
        u.departmentId = token.departmentId
        u.departmentName = token.departmentName
        // Legacy compat
        u.role = token.primaryRole || token.role
      }
      return session
    },
  },
  providers: [], // Configured in auth.ts
}
