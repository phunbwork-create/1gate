import { CompanyType } from "@prisma/client"

// Extend NextAuth types for Dynamic RBAC
declare module "next-auth" {
  interface User {
    id: string
    email: string
    name: string
    // Dynamic RBAC
    roles: string[]
    permissions: string[]
    primaryRole: string
    primaryRoleDisplay?: string
    primaryRoleColor?: string
    rolesData?: { id: string; name: string; displayName: string; color?: string | null; level: number; isSystem: boolean }[]
    // Legacy compat
    role: string
    // Company info
    companyId: string
    companyName: string
    companyCode: string
    companyType: CompanyType
    departmentId?: string | null
    departmentName?: string | null
  }

  interface Session {
    user: {
      id: string
      email: string
      name: string
      // Dynamic RBAC
      roles: string[]
      permissions: string[]
      primaryRole: string
      primaryRoleDisplay?: string
      primaryRoleColor?: string
      rolesData?: { id: string; name: string; displayName: string; color?: string | null; level: number; isSystem: boolean }[]
      // Legacy compat
      role: string
      // Company info
      companyId: string
      companyName: string
      companyCode: string
      companyType: CompanyType
      departmentId?: string | null
      departmentName?: string | null
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    // Dynamic RBAC
    roles: string[]
    permissions: string[]
    primaryRole: string
    primaryRoleDisplay?: string
    primaryRoleColor?: string
    rolesData?: unknown[]
    // Legacy compat
    role: string
    // Company info
    companyId: string
    companyName: string
    companyCode: string
    companyType: string
    departmentId?: string
    departmentName?: string
  }
}
