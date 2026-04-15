import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  // Use direct PostgreSQL TCP connection (prisma dev exposes PG at port 51214)
  const directUrl = process.env.DIRECT_DATABASE_URL
    || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable"

  const pool = new pg.Pool({
    connectionString: directUrl,
    max: 10,
  })

  const adapter = new PrismaPg(pool)

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export default prisma
