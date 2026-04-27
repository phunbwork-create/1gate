import "dotenv/config"
import { PrismaClient, Role, CompanyType } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { hash } from "bcryptjs"

// For seeding, use direct PostgreSQL connection via pg adapter
const pool = new pg.Pool({
  connectionString: process.env.DIRECT_DATABASE_URL
    || "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.log("🌱 Seeding database...")

  // ─── COMPANIES ──────────────────────────────────────────────────────────────
  const ho = await prisma.company.upsert({
    where: { code: "HO" },
    update: {},
    create: {
      name: "FIS Corporation - Hội sở",
      code: "HO",
      type: CompanyType.HO,
      taxCode: "0100000000",
      address: "Hà Nội",
    },
  })

  const cttv1 = await prisma.company.upsert({
    where: { code: "CTTV1" },
    update: {},
    create: {
      name: "Chi nhánh Hồ Chí Minh",
      code: "CTTV1",
      type: CompanyType.CTTV,
      taxCode: "0100000001",
      address: "TP. Hồ Chí Minh",
    },
  })

  const cttv2 = await prisma.company.upsert({
    where: { code: "CTTV2" },
    update: {},
    create: {
      name: "Chi nhánh Đà Nẵng",
      code: "CTTV2",
      type: CompanyType.CTTV,
      taxCode: "0100000002",
      address: "Đà Nẵng",
    },
  })

  console.log("  ✅ Companies created:", ho.name, cttv1.name, cttv2.name)

  // ─── DEPARTMENTS ────────────────────────────────────────────────────────────
  const deptData = [
    { name: "Ban Giám đốc", code: "BGD", companyId: ho.id },
    { name: "Phòng Kế toán", code: "KT", companyId: ho.id },
    { name: "Phòng Mua hàng", code: "MH", companyId: ho.id },
    { name: "Phòng Kho vận", code: "KV", companyId: ho.id },
    { name: "Phòng Kinh doanh", code: "KD", companyId: ho.id },
    { name: "Phòng Hành chính", code: "HC", companyId: ho.id },
    // CTTV1
    { name: "Ban Giám đốc", code: "BGD", companyId: cttv1.id },
    { name: "Phòng Kế toán", code: "KT", companyId: cttv1.id },
    { name: "Phòng Kinh doanh", code: "KD", companyId: cttv1.id },
    { name: "Phòng Kho vận", code: "KV", companyId: cttv1.id },
    // CTTV2
    { name: "Ban Giám đốc", code: "BGD", companyId: cttv2.id },
    { name: "Phòng Kế toán", code: "KT", companyId: cttv2.id },
    { name: "Phòng Kinh doanh", code: "KD", companyId: cttv2.id },
  ]

  const departments: Record<string, { id: string }> = {}
  for (const dept of deptData) {
    const created = await prisma.department.upsert({
      where: { code_companyId: { code: dept.code, companyId: dept.companyId } },
      update: {},
      create: dept,
    })
    departments[`${dept.code}-${dept.companyId}`] = created
  }

  console.log("  ✅ Departments created:", Object.keys(departments).length)

  // ─── DEFAULT PASSWORD ───────────────────────────────────────────────────────
  const defaultPassword = await hash("123456", 12)

  // ─── USERS ──────────────────────────────────────────────────────────────────
  const users = [
    // HO Users
    {
      email: "admin@1gate.vn",
      name: "Admin Hệ thống",
      role: Role.Admin,
      companyId: ho.id,
      departmentId: departments[`HC-${ho.id}`]?.id,
    },
    {
      email: "director.ho@1gate.vn",
      name: "Nguyễn Văn Nhân",
      role: Role.Director,
      companyId: ho.id,
      departmentId: departments[`BGD-${ho.id}`]?.id,
    },
    {
      email: "chief.accountant@1gate.vn",
      name: "Trần Thị Nguyệt",
      role: Role.ChiefAccountant,
      companyId: ho.id,
      departmentId: departments[`KT-${ho.id}`]?.id,
    },
    {
      email: "accountant.ho@1gate.vn",
      name: "Lê Thị Hoa",
      role: Role.Accountant,
      companyId: ho.id,
      departmentId: departments[`KT-${ho.id}`]?.id,
    },
    {
      email: "depthead.kd@1gate.vn",
      name: "Phạm Minh Tuấn",
      role: Role.DeptHead,
      companyId: ho.id,
      departmentId: departments[`KD-${ho.id}`]?.id,
    },
    {
      email: "purchasing@1gate.vn",
      name: "Hoàng Anh Dũng",
      role: Role.Purchasing,
      companyId: ho.id,
      departmentId: departments[`MH-${ho.id}`]?.id,
    },
    {
      email: "warehouse@1gate.vn",
      name: "Ngô Đức Thắng",
      role: Role.Warehouse,
      companyId: ho.id,
      departmentId: departments[`KV-${ho.id}`]?.id,
    },
    {
      email: "staff.kd@1gate.vn",
      name: "Vũ Thị Lan",
      role: Role.Staff,
      companyId: ho.id,
      departmentId: departments[`KD-${ho.id}`]?.id,
    },

    // CTTV1 Users
    {
      email: "director.cttv1@1gate.vn",
      name: "Bùi Quang Hải",
      role: Role.Director,
      companyId: cttv1.id,
      departmentId: departments[`BGD-${cttv1.id}`]?.id,
    },
    {
      email: "accountant.cttv1@1gate.vn",
      name: "Đỗ Thị Mai",
      role: Role.Accountant,
      companyId: cttv1.id,
      departmentId: departments[`KT-${cttv1.id}`]?.id,
    },
    {
      email: "staff.cttv1@1gate.vn",
      name: "Trương Minh Khoa",
      role: Role.Staff,
      companyId: cttv1.id,
      departmentId: departments[`KD-${cttv1.id}`]?.id,
    },

    // CTTV2 Users
    {
      email: "director.cttv2@1gate.vn",
      name: "Lý Thanh Sơn",
      role: Role.Director,
      companyId: cttv2.id,
      departmentId: departments[`BGD-${cttv2.id}`]?.id,
    },
    {
      email: "staff.cttv2@1gate.vn",
      name: "Phan Ngọc Ánh",
      role: Role.Staff,
      companyId: cttv2.id,
      departmentId: departments[`KD-${cttv2.id}`]?.id,
    },
  ]

  for (const userData of users) {
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        passwordHash: defaultPassword,
      },
    })
  }

  console.log("  ✅ Users created:", users.length)

  // ─── VENDORS ────────────────────────────────────────────────────────────────
  const vendors = [
    {
      name: "Công ty TNHH Thiết bị VP Phương Nam",
      taxCode: "0300000001",
      bankAccount: "1234567890",
      bankName: "Vietcombank",
      phone: "028 1234 5678",
      companyId: ho.id,
    },
    {
      name: "Công ty CP Công nghệ ABC",
      taxCode: "0300000002",
      bankAccount: "9876543210",
      bankName: "BIDV",
      phone: "024 8765 4321",
      companyId: ho.id,
    },
    {
      name: "Nhà cung cấp Vật liệu Xây dựng Hoàng Gia",
      taxCode: "0300000003",
      bankAccount: "5555666677",
      bankName: "Techcombank",
      companyId: ho.id,
    },
  ]

  for (const vendor of vendors) {
    await prisma.vendor.upsert({
      where: { taxCode_companyId: { taxCode: vendor.taxCode, companyId: vendor.companyId } },
      update: {},
      create: vendor,
    })
  }

  console.log("  ✅ Vendors created:", vendors.length)

  // ─── MATERIAL ITEMS ─────────────────────────────────────────────────────────
  const materialItems = [
    { code: "VT001", name: "Giấy A4 Double A 80gsm", unit: "Ram", category: "Văn phòng phẩm", companyId: ho.id },
    { code: "VT002", name: "Bút bi Thiên Long TL-027", unit: "Cây", category: "Văn phòng phẩm", companyId: ho.id },
    { code: "VT003", name: "Mực in HP 85A", unit: "Hộp", category: "Tin học", companyId: ho.id },
    { code: "VT004", name: "Chuột không dây Logitech M331", unit: "Cái", category: "Tin học", companyId: ho.id },
    { code: "VT005", name: "Bàn phím cơ Akko 3068B", unit: "Cái", category: "Tin học", companyId: ho.id },
    { code: "VT006", name: "Màn hình Dell 24\" P2422H", unit: "Cái", category: "Thiết bị", companyId: ho.id },
    { code: "VT007", name: "Ghế xoay văn phòng Hòa Phát SG920", unit: "Cái", category: "Nội thất", companyId: ho.id },
    { code: "VT008", name: "Bàn làm việc 1m4 Hòa Phát HP140", unit: "Cái", category: "Nội thất", companyId: ho.id },
    { code: "VT009", name: "Máy chiếu Epson EB-X51", unit: "Cái", category: "Thiết bị", companyId: ho.id },
    { code: "VT010", name: "Tủ hồ sơ sắt 3 ngăn", unit: "Cái", category: "Nội thất", companyId: ho.id },
  ]

  for (const item of materialItems) {
    await prisma.materialItem.upsert({
      where: { code_companyId: { code: item.code, companyId: item.companyId } },
      update: {},
      create: item,
    })
  }

  console.log("  ✅ Material items created:", materialItems.length)

  console.log("\n🎉 Seeding completed!")
  console.log("\n📋 Login accounts (password: 123456):")
  console.log("   Admin:           admin@1gate.vn")
  console.log("   Giám đốc HO:    director.ho@1gate.vn")
  console.log("   KTT:             chief.accountant@1gate.vn")
  console.log("   Kế toán:         accountant.ho@1gate.vn")
  console.log("   Trưởng phòng:    depthead.kd@1gate.vn")
  console.log("   Mua hàng:        purchasing@1gate.vn")
  console.log("   Thủ kho:         warehouse@1gate.vn")
  console.log("   Nhân viên:       staff.kd@1gate.vn")
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
