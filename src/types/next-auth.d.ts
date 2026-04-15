import { Role, CompanyType } from "@prisma/client"

// Extend NextAuth types
declare module "next-auth" {
  interface User {
    id: string
    email: string
    name: string
    role: Role
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
      role: Role
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
    role: string
    companyId: string
    companyName: string
    companyCode: string
    companyType: string
    departmentId?: string
    departmentName?: string
  }
}
