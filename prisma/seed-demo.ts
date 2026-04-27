/**
 * DEMO SEED — Tạo data test đầy đủ cho tất cả trạng thái & case
 * Chạy: npx tsx prisma/seed-demo.ts
 */
import "dotenv/config"
import { PrismaClient, Role, CompanyType, RequestStatus, InvoiceScenario, DocumentType, PaymentPlanStatus, PlanItemStatus } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { hash } from "bcryptjs"

const pool = new pg.Pool({
  connectionString: "postgres://postgres:postgres@localhost:51214/template1?sslmode=disable",
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function daysAgo(n: number) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}
function daysFromNow(n: number) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

async function main() {
  console.log("🌱 DEMO SEED — bắt đầu...")

  // ─── PASSWORD ────────────────────────────────────────────────────────────────
  const pwd = await hash("123456", 12)

  // ─── COMPANIES ───────────────────────────────────────────────────────────────
  const ho = await prisma.company.upsert({
    where: { code: "HO" },
    update: {},
    create: { name: "SMT Corporation - Hội sở", code: "HO", type: CompanyType.HO, taxCode: "0100000000", address: "Hà Nội" },
  })
  const cttv1 = await prisma.company.upsert({
    where: { code: "CTTV1" },
    update: {},
    create: { name: "Chi nhánh Hồ Chí Minh", code: "CTTV1", type: CompanyType.CTTV, taxCode: "0100000001", address: "TP. Hồ Chí Minh" },
  })
  console.log("  ✅ Companies:", ho.name, cttv1.name)

  // ─── DEPARTMENTS ─────────────────────────────────────────────────────────────
  const deptData = [
    { name: "Ban Giám đốc",    code: "BGD", companyId: ho.id },
    { name: "Phòng Kế toán",   code: "KT",  companyId: ho.id },
    { name: "Phòng Mua hàng",  code: "MH",  companyId: ho.id },
    { name: "Phòng Kho vận",   code: "KV",  companyId: ho.id },
    { name: "Phòng Kinh doanh",code: "KD",  companyId: ho.id },
    { name: "Phòng Hành chính",code: "HC",  companyId: ho.id },
    { name: "Ban Giám đốc",    code: "BGD", companyId: cttv1.id },
    { name: "Phòng Kế toán",   code: "KT",  companyId: cttv1.id },
    { name: "Phòng Kinh doanh",code: "KD",  companyId: cttv1.id },
  ]
  const depts: Record<string, { id: string }> = {}
  for (const d of deptData) {
    const r = await prisma.department.upsert({
      where: { code_companyId: { code: d.code, companyId: d.companyId } },
      update: {}, create: d,
    })
    depts[`${d.code}-${d.companyId}`] = r
  }
  console.log("  ✅ Departments:", Object.keys(depts).length)

  // ─── USERS ───────────────────────────────────────────────────────────────────
  const userDefs = [
    { email: "admin@1gate.vn",            name: "Admin Hệ thống",    role: Role.Admin,           companyId: ho.id,    deptKey: `HC-${ho.id}` },
    { email: "director.ho@1gate.vn",      name: "Nguyễn Văn Nhân",   role: Role.Director,        companyId: ho.id,    deptKey: `BGD-${ho.id}` },
    { email: "chief.accountant@1gate.vn", name: "Trần Thị Nguyệt",   role: Role.ChiefAccountant, companyId: ho.id,    deptKey: `KT-${ho.id}` },
    { email: "accountant.ho@1gate.vn",    name: "Lê Thị Hoa",        role: Role.Accountant,      companyId: ho.id,    deptKey: `KT-${ho.id}` },
    { email: "depthead.kd@1gate.vn",      name: "Phạm Minh Tuấn",    role: Role.DeptHead,        companyId: ho.id,    deptKey: `KD-${ho.id}` },
    { email: "purchasing@1gate.vn",       name: "Hoàng Anh Dũng",    role: Role.Purchasing,      companyId: ho.id,    deptKey: `MH-${ho.id}` },
    { email: "warehouse@1gate.vn",        name: "Ngô Đức Thắng",     role: Role.Warehouse,       companyId: ho.id,    deptKey: `KV-${ho.id}` },
    { email: "staff.kd@1gate.vn",         name: "Vũ Thị Lan",        role: Role.Staff,           companyId: ho.id,    deptKey: `KD-${ho.id}` },
    { email: "staff2.kd@1gate.vn",        name: "Nguyễn Hữu Phúc",   role: Role.Staff,           companyId: ho.id,    deptKey: `KD-${ho.id}` },
    { email: "director.cttv1@1gate.vn",   name: "Bùi Quang Hải",     role: Role.Director,        companyId: cttv1.id, deptKey: `BGD-${cttv1.id}` },
    { email: "accountant.cttv1@1gate.vn", name: "Đỗ Thị Mai",        role: Role.Accountant,      companyId: cttv1.id, deptKey: `KT-${cttv1.id}` },
    { email: "staff.cttv1@1gate.vn",      name: "Trương Minh Khoa",  role: Role.Staff,           companyId: cttv1.id, deptKey: `KD-${cttv1.id}` },
  ]
  const users: Record<string, { id: string; companyId: string; role: Role }> = {}
  for (const u of userDefs) {
    const r = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { email: u.email, name: u.name, role: u.role, companyId: u.companyId, departmentId: depts[u.deptKey]?.id, passwordHash: pwd },
    })
    users[u.email] = { id: r.id, companyId: r.companyId, role: r.role }
  }
  console.log("  ✅ Users:", Object.keys(users).length)

  // ─── VENDORS ─────────────────────────────────────────────────────────────────
  const vendorDefs = [
    { name: "Công ty TNHH Thiết bị VP Phương Nam", taxCode: "0300000001", bankAccount: "1234567890", bankName: "Vietcombank",  phone: "028 1234 5678", companyId: ho.id },
    { name: "Công ty CP Công nghệ ABC",             taxCode: "0300000002", bankAccount: "9876543210", bankName: "BIDV",         phone: "024 8765 4321", companyId: ho.id },
    { name: "Nhà cung cấp Vật liệu Hoàng Gia",     taxCode: "0300000003", bankAccount: "5555666677", bankName: "Techcombank",  phone: "028 9999 1111", companyId: ho.id },
    { name: "Công ty Dịch vụ Vận tải Nhanh",       taxCode: "0300000004", bankAccount: "1111222233", bankName: "Agribank",     phone: "024 3333 4444", companyId: ho.id },
  ]
  const vendors: { id: string; name: string; bankAccount: string | null; bankName: string | null }[] = []
  for (const v of vendorDefs) {
    const r = await prisma.vendor.upsert({
      where: { taxCode_companyId: { taxCode: v.taxCode, companyId: v.companyId } },
      update: {}, create: v,
    })
    vendors.push(r)
  }
  console.log("  ✅ Vendors:", vendors.length)

  // ─── PAYMENT REQUESTS — đủ 7 trạng thái ──────────────────────────────────────
  // Helper: tạo code tăng dần
  let prCounter = 1
  const prCode = () => `DNTT${String(prCounter++).padStart(4, "0")}`

  const staff     = users["staff.kd@1gate.vn"]
  const staff2    = users["staff2.kd@1gate.vn"]
  const accountant = users["accountant.ho@1gate.vn"]
  const director  = users["director.ho@1gate.vn"]
  const chiefAcc  = users["chief.accountant@1gate.vn"]
  const purchasing = users["purchasing@1gate.vn"]

  //
  // CASE 1 — Draft (chưa submit): do staff tạo, nhập thừa thiếu
  //
  const pr1 = await prisma.paymentRequest.upsert({
    where: { code: "DNTT0001" },
    update: {},
    create: {
      code: "DNTT0001",
      companyId: ho.id,
      createdById: staff.id,
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      bankAccount: "1234567890",
      bankName: "Vietcombank",
      amount: 3_000_000,
      description: "Thanh toán mua văn phòng phẩm Quý 2/2026",
      invoiceScenario: InvoiceScenario.HasInvoice,
      invoiceNumber: "HD-2026-001",
      invoiceDate: daysAgo(3),
      status: RequestStatus.Draft,
      createdAt: daysAgo(5),
    },
  })
  // Attachment: hóa đơn
  await prisma.attachment.create({
    data: { fileName: "hoa_don_HD2026001.pdf", fileUrl: "/demo/hoa_don.pdf", fileSize: 245000, mimeType: "application/pdf", documentType: DocumentType.Invoice, paymentRequestId: pr1.id },
  })
  console.log("  ✅ CASE 1 — Draft:", pr1.code)

  //
  // CASE 2 — Submitted (đã nộp, chờ kế toán duyệt): amount 4tr, có HĐ
  //
  const pr2 = await prisma.paymentRequest.upsert({
    where: { code: "DNTT0002" },
    update: {},
    create: {
      code: "DNTT0002",
      companyId: ho.id,
      createdById: staff.id,
      vendorId: vendors[1].id,
      vendorName: vendors[1].name,
      bankAccount: "9876543210",
      bankName: "BIDV",
      amount: 4_500_000,
      description: "Thanh toán dịch vụ CNTT tháng 4/2026",
      invoiceScenario: InvoiceScenario.HasInvoice,
      invoiceNumber: "HD-2026-002",
      invoiceDate: daysAgo(1),
      status: RequestStatus.Submitted,
      submittedAt: daysAgo(1),
      isLocked: true,
      createdAt: daysAgo(2),
    },
  })
  await prisma.attachment.create({
    data: { fileName: "hoa_don_CNTT_T4.pdf", fileUrl: "/demo/hoa_don_cntt.pdf", fileSize: 312000, mimeType: "application/pdf", documentType: DocumentType.Invoice, paymentRequestId: pr2.id },
  })
  console.log("  ✅ CASE 2 — Submitted:", pr2.code)

  //
  // CASE 3 — Submitted (> 5 triệu, có báo giá): chờ kế toán duyệt
  //
  const pr3 = await prisma.paymentRequest.upsert({
    where: { code: "DNTT0003" },
    update: {},
    create: {
      code: "DNTT0003",
      companyId: ho.id,
      createdById: purchasing.id,
      vendorId: vendors[2].id,
      vendorName: vendors[2].name,
      bankAccount: "5555666677",
      bankName: "Techcombank",
      amount: 8_000_000,
      description: "Mua vật liệu xây dựng sửa chữa kho - Q2/2026",
      invoiceScenario: InvoiceScenario.HasInvoice,
      invoiceNumber: "HD-2026-003",
      invoiceDate: daysAgo(2),
      status: RequestStatus.Submitted,
      submittedAt: daysAgo(2),
      isLocked: true,
      createdAt: daysAgo(3),
    },
  })
  // Có báo giá (> 5 triệu)
  await prisma.attachment.createMany({
    data: [
      { fileName: "bao_gia_vat_lieu.pdf",    fileUrl: "/demo/bao_gia.pdf",    fileSize: 198000, mimeType: "application/pdf", documentType: DocumentType.Quotation, paymentRequestId: pr3.id },
      { fileName: "hoa_don_vat_lieu.pdf",    fileUrl: "/demo/hoa_don_vl.pdf", fileSize: 287000, mimeType: "application/pdf", documentType: DocumentType.Invoice,   paymentRequestId: pr3.id },
    ],
  })
  console.log("  ✅ CASE 3 — Submitted >5tr (có báo giá):", pr3.code)

  //
  // CASE 4 — Approved (đã được kế toán duyệt): amount 12tr
  //
  const pr4 = await prisma.paymentRequest.upsert({
    where: { code: "DNTT0004" },
    update: {},
    create: {
      code: "DNTT0004",
      companyId: ho.id,
      createdById: staff.id,
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      bankAccount: "1234567890",
      bankName: "Vietcombank",
      amount: 12_000_000,
      description: "Thanh toán thiết bị văn phòng — màn hình Dell x5",
      invoiceScenario: InvoiceScenario.HasInvoice,
      invoiceNumber: "HD-2026-004",
      invoiceDate: daysAgo(10),
      status: RequestStatus.Approved,
      submittedAt: daysAgo(8),
      approvedAt: daysAgo(6),
      isLocked: true,
      createdAt: daysAgo(10),
    },
  })
  await prisma.approvalStep.create({
    data: {
      paymentRequestId: pr4.id,
      approverId: accountant.id,
      role: Role.Accountant,
      stepOrder: 1,
      action: "approve",
      comment: "Đã kiểm tra hóa đơn và báo giá, đồng ý duyệt.",
      actedAt: daysAgo(6),
    },
  })
  await prisma.attachment.createMany({
    data: [
      { fileName: "bao_gia_man_hinh_dell.pdf", fileUrl: "/demo/bao_gia_dell.pdf", fileSize: 156000, mimeType: "application/pdf", documentType: DocumentType.Quotation, paymentRequestId: pr4.id },
      { fileName: "hoa_don_dell_x5.pdf",       fileUrl: "/demo/hoa_don_dell.pdf", fileSize: 420000, mimeType: "application/pdf", documentType: DocumentType.Invoice,   paymentRequestId: pr4.id },
    ],
  })
  console.log("  ✅ CASE 4 — Approved (12tr):", pr4.code)

  //
  // CASE 5 — Rejected (bị từ chối)
  //
  const pr5 = await prisma.paymentRequest.upsert({
    where: { code: "DNTT0005" },
    update: {},
    create: {
      code: "DNTT0005",
      companyId: ho.id,
      createdById: staff2.id,
      vendorName: "Cá nhân Trần Văn Bình",
      bankAccount: "0099887766",
      bankName: "MB Bank",
      amount: 2_000_000,
      description: "Thanh toán chi phí tiếp khách — không hóa đơn",
      invoiceScenario: InvoiceScenario.NoInvoice,
      status: RequestStatus.Rejected,
      submittedAt: daysAgo(7),
      isLocked: true,
      createdAt: daysAgo(8),
    },
  })
  await prisma.approvalStep.create({
    data: {
      paymentRequestId: pr5.id,
      approverId: accountant.id,
      role: Role.Accountant,
      stepOrder: 1,
      action: "reject",
      comment: "Chi phí tiếp khách cần có hóa đơn hợp lệ hoặc quyết định của BGĐ. Từ chối xử lý.",
      actedAt: daysAgo(6),
    },
  })
  console.log("  ✅ CASE 5 — Rejected:", pr5.code)

  //
  // CASE 6 — Returned (trả về, yêu cầu bổ sung): > 5tr thiếu báo giá
  //
  const pr6 = await prisma.paymentRequest.upsert({
    where: { code: "DNTT0006" },
    update: {},
    create: {
      code: "DNTT0006",
      companyId: ho.id,
      createdById: staff.id,
      vendorId: vendors[2].id,
      vendorName: vendors[2].name,
      bankAccount: "5555666677",
      bankName: "Techcombank",
      amount: 6_200_000,
      description: "Mua ghế văn phòng cao cấp x10 cái",
      invoiceScenario: InvoiceScenario.HasInvoice,
      invoiceNumber: "HD-2026-006",
      invoiceDate: daysAgo(5),
      status: RequestStatus.Returned,
      submittedAt: daysAgo(5),
      isLocked: false,
      createdAt: daysAgo(6),
    },
  })
  await prisma.approvalStep.create({
    data: {
      paymentRequestId: pr6.id,
      approverId: accountant.id,
      role: Role.Accountant,
      stepOrder: 1,
      action: "return",
      comment: "Số tiền > 5 triệu nhưng thiếu Báo giá từ nhà cung cấp. Vui lòng bổ sung và nộp lại.",
      actedAt: daysAgo(4),
    },
  })
  await prisma.attachment.create({
    data: { fileName: "hoa_don_ghe_VP.pdf", fileUrl: "/demo/hoa_don_ghe.pdf", fileSize: 195000, mimeType: "application/pdf", documentType: DocumentType.Invoice, paymentRequestId: pr6.id },
  })
  console.log("  ✅ CASE 6 — Returned (thiếu báo giá):", pr6.code)

  //
  // CASE 7 — Cancelled (người dùng tự hủy)
  //
  const pr7 = await prisma.paymentRequest.upsert({
    where: { code: "DNTT0007" },
    update: {},
    create: {
      code: "DNTT0007",
      companyId: ho.id,
      createdById: staff2.id,
      vendorName: "Nhà in Đại Việt",
      bankAccount: "2233445566",
      bankName: "VPBank",
      amount: 1_500_000,
      description: "In tài liệu nội bộ Quý 1 — tự hủy vì đã có đủ hàng",
      invoiceScenario: InvoiceScenario.InvoiceLater,
      status: RequestStatus.Cancelled,
      createdAt: daysAgo(15),
    },
  })
  console.log("  ✅ CASE 7 — Cancelled:", pr7.code)

  //
  // CASE 8 — Approved >20 triệu (có báo giá + hợp đồng)
  //
  const pr8 = await prisma.paymentRequest.upsert({
    where: { code: "DNTT0008" },
    update: {},
    create: {
      code: "DNTT0008",
      companyId: ho.id,
      createdById: purchasing.id,
      vendorId: vendors[1].id,
      vendorName: vendors[1].name,
      bankAccount: "9876543210",
      bankName: "BIDV",
      amount: 35_000_000,
      description: "Mua máy chủ server rack + UPS + switch — đợt 1",
      invoiceScenario: InvoiceScenario.HasInvoice,
      invoiceNumber: "HD-2026-008",
      invoiceDate: daysAgo(20),
      status: RequestStatus.Approved,
      submittedAt: daysAgo(18),
      approvedAt: daysAgo(15),
      isLocked: true,
      createdAt: daysAgo(22),
    },
  })
  await prisma.approvalStep.create({
    data: {
      paymentRequestId: pr8.id,
      approverId: accountant.id,
      role: Role.Accountant,
      stepOrder: 1,
      action: "approve",
      comment: "Đã xác nhận hợp đồng và báo giá. Đề nghị hợp lệ, đồng ý duyệt.",
      actedAt: daysAgo(15),
    },
  })
  await prisma.attachment.createMany({
    data: [
      { fileName: "bao_gia_server_rack.pdf",  fileUrl: "/demo/bao_gia_server.pdf",  fileSize: 520000, mimeType: "application/pdf", documentType: DocumentType.Quotation, paymentRequestId: pr8.id },
      { fileName: "hop_dong_CNTT_2026.pdf",   fileUrl: "/demo/hop_dong.pdf",        fileSize: 1240000, mimeType: "application/pdf", documentType: DocumentType.Contract,  paymentRequestId: pr8.id },
      { fileName: "hoa_don_server_rack.pdf",  fileUrl: "/demo/hoa_don_server.pdf",  fileSize: 380000, mimeType: "application/pdf", documentType: DocumentType.Invoice,   paymentRequestId: pr8.id },
      { fileName: "bien_ban_nghiem_thu.pdf",  fileUrl: "/demo/nghiem_thu.pdf",      fileSize: 290000, mimeType: "application/pdf", documentType: DocumentType.AcceptanceCert, paymentRequestId: pr8.id },
    ],
  })
  console.log("  ✅ CASE 8 — Approved >20tr (báo giá + HĐ + nghiệm thu):", pr8.code)

  //
  // CASE 9 — Hóa đơn nộp sau (InvoiceLater), đang chờ duyệt
  //
  const pr9 = await prisma.paymentRequest.upsert({
    where: { code: "DNTT0009" },
    update: {},
    create: {
      code: "DNTT0009",
      companyId: ho.id,
      createdById: staff.id,
      vendorId: vendors[3].id,
      vendorName: vendors[3].name,
      bankAccount: "1111222233",
      bankName: "Agribank",
      amount: 3_800_000,
      description: "Chi phí vận chuyển hàng từ kho HN → HCM — tháng 4",
      invoiceScenario: InvoiceScenario.InvoiceLater,
      status: RequestStatus.Submitted,
      submittedAt: daysAgo(1),
      isLocked: true,
      createdAt: daysAgo(1),
    },
  })
  console.log("  ✅ CASE 9 — Submitted InvoiceLater:", pr9.code)

  //
  // CASE 10 — Closed (đã vào kế hoạch thanh toán)
  //
  const pr10 = await prisma.paymentRequest.upsert({
    where: { code: "DNTT0010" },
    update: {},
    create: {
      code: "DNTT0010",
      companyId: ho.id,
      createdById: staff2.id,
      vendorId: vendors[0].id,
      vendorName: vendors[0].name,
      bankAccount: "1234567890",
      bankName: "Vietcombank",
      amount: 5_000_000,
      description: "Mua bàn ghế phòng họp số 3 — Q1/2026",
      invoiceScenario: InvoiceScenario.HasInvoice,
      invoiceNumber: "HD-2026-010",
      invoiceDate: daysAgo(30),
      status: RequestStatus.Closed,
      submittedAt: daysAgo(28),
      approvedAt: daysAgo(25),
      isLocked: true,
      createdAt: daysAgo(30),
    },
  })
  await prisma.approvalStep.create({
    data: {
      paymentRequestId: pr10.id,
      approverId: accountant.id,
      role: Role.Accountant,
      stepOrder: 1,
      action: "approve",
      comment: "OK",
      actedAt: daysAgo(25),
    },
  })
  await prisma.attachment.createMany({
    data: [
      { fileName: "hoa_don_ban_ghe_phong_hop.pdf", fileUrl: "/demo/hd_ban_ghe.pdf", fileSize: 210000, mimeType: "application/pdf", documentType: DocumentType.Invoice, paymentRequestId: pr10.id },
      { fileName: "bao_gia_ban_ghe_HPF.pdf",       fileUrl: "/demo/bq_ban_ghe.pdf", fileSize: 143000, mimeType: "application/pdf", documentType: DocumentType.Quotation, paymentRequestId: pr10.id },
    ],
  })
  console.log("  ✅ CASE 10 — Closed:", pr10.code)

  // ─── PAYMENT PLAN — kế hoạch thanh toán ─────────────────────────────────────
  // Plan 1: Đang chờ KTT duyệt
  const plan1 = await prisma.paymentPlan.upsert({
    where: { code: "KHTT0001" },
    update: {},
    create: {
      code: "KHTT0001",
      companyId: ho.id,
      createdById: accountant.id,
      status: PaymentPlanStatus.PendingChiefAccountant,
      plannedDate: daysFromNow(3),
      totalAmount: 49_500_000,
      note: "Kế hoạch thanh toán tuần 16/2026 — tổng hợp các đề nghị đã duyệt",
      submittedAt: daysAgo(1),
      isLocked: true,
      createdAt: daysAgo(2),
    },
  })
  await prisma.paymentPlanItem.createMany({
    data: [
      { planId: plan1.id, paymentRequestId: pr4.id,  originalAmount: 12_000_000, status: PlanItemStatus.Pending },
      { planId: plan1.id, paymentRequestId: pr8.id,  originalAmount: 35_000_000, status: PlanItemStatus.Pending },
      { planId: plan1.id, paymentRequestId: pr10.id, originalAmount: 5_000_000,  status: PlanItemStatus.Pending },
    ],
  })
  console.log("  ✅ Plan 1 — PendingChiefAccountant:", plan1.code)

  // Plan 2: Đã được KTT + GĐ duyệt, sẵn sàng thực hiện
  const plan2 = await prisma.paymentPlan.upsert({
    where: { code: "KHTT0002" },
    update: {},
    create: {
      code: "KHTT0002",
      companyId: ho.id,
      createdById: accountant.id,
      status: PaymentPlanStatus.Approved,
      plannedDate: daysAgo(2),
      totalAmount: 5_000_000,
      approvedAmount: 5_000_000,
      note: "Kế hoạch thanh toán tuần 15/2026",
      submittedAt: daysAgo(5),
      chiefApprovedAt: daysAgo(4),
      directorApprovedAt: daysAgo(3),
      isLocked: true,
      createdAt: daysAgo(6),
    },
  })
  await prisma.approvalStep.createMany({
    data: [
      { paymentPlanId: plan2.id, approverId: chiefAcc.id, role: Role.ChiefAccountant, stepOrder: 1, action: "approve", comment: "Xác nhận số tiền hợp lệ.", actedAt: daysAgo(4) },
      { paymentPlanId: plan2.id, approverId: director.id, role: Role.Director,        stepOrder: 2, action: "approve", comment: "Đồng ý thanh toán.",         actedAt: daysAgo(3) },
    ],
  })
  console.log("  ✅ Plan 2 — Approved (KTT + GĐ):", plan2.code)

  // ─── ADVANCE REQUESTS ────────────────────────────────────────────────────────
  // Tạm ứng 1: Draft
  const adv1 = await prisma.advanceRequest.upsert({
    where: { code: "TU0001" },
    update: {},
    create: {
      code: "TU0001",
      companyId: ho.id,
      createdById: staff.id,
      vendorId: vendors[3].id,
      vendorName: vendors[3].name,
      amount: 10_000_000,
      purpose: "Tạm ứng chi phí công tác TPHCM — đoàn 5 người, 3 ngày",
      expectedReturnDate: daysFromNow(10),
      invoiceScenario: InvoiceScenario.InvoiceLater,
      status: RequestStatus.Draft,
      createdAt: daysAgo(1),
    },
  })
  console.log("  ✅ Advance 1 — Draft:", adv1.code)

  // Tạm ứng 2: Approved
  const adv2 = await prisma.advanceRequest.upsert({
    where: { code: "TU0002" },
    update: {},
    create: {
      code: "TU0002",
      companyId: ho.id,
      createdById: staff2.id,
      amount: 4_000_000,
      purpose: "Tạm ứng mua vật tư khẩn cấp — sửa chữa máy in",
      expectedReturnDate: daysFromNow(5),
      invoiceScenario: InvoiceScenario.InvoiceLater,
      status: RequestStatus.Approved,
      submittedAt: daysAgo(5),
      approvedAt: daysAgo(3),
      isLocked: true,
      createdAt: daysAgo(6),
    },
  })
  await prisma.approvalStep.create({
    data: {
      advanceRequestId: adv2.id,
      approverId: accountant.id,
      role: Role.Accountant,
      stepOrder: 1,
      action: "approve",
      comment: "Đồng ý tạm ứng.",
      actedAt: daysAgo(3),
    },
  })
  console.log("  ✅ Advance 2 — Approved:", adv2.code)

  // ─── SUMMARY ─────────────────────────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║          🎉 DEMO DATA READY — http://localhost:3000             ║
╠══════════════════════════════════════════════════════════════════╣
║  PASSWORD MẶC ĐỊNH: 123456                                       ║
╠══════════════════════════════════════════════════════════════════╣
║  DEMO THEO ROLE                                                  ║
╠══════════════════════════════════════════════════════════════════╣
║  👤 Staff (tạo phiếu)         staff.kd@1gate.vn                 ║
║  👤 Staff 2 (tạo phiếu)       staff2.kd@1gate.vn                ║
║  👤 Mua hàng (tạo phiếu)      purchasing@1gate.vn               ║
║  ✅ Kế toán (duyệt/từ chối)   accountant.ho@1gate.vn            ║
║  ✅ KTT (duyệt kế hoạch TT)   chief.accountant@1gate.vn         ║
║  ✅ Giám đốc (duyệt KH TT)    director.ho@1gate.vn              ║
║  🔧 Admin (full quyền)        admin@1gate.vn                    ║
╠══════════════════════════════════════════════════════════════════╣
║  TRẠNG THÁI CÁC PHIẾU DNTT                                      ║
╠══════════════════════════════════════════════════════════════════╣
║  DNTT0001 — Draft          (3tr, HĐ nội bộ)                     ║
║  DNTT0002 — Submitted      (4.5tr, chờ KT duyệt)                ║
║  DNTT0003 — Submitted      (8tr, có báo giá, chờ KT duyệt)      ║
║  DNTT0004 — Approved       (12tr, báo giá + HĐ)                 ║
║  DNTT0005 — Rejected       (từ chối - thiếu HĐ hợp lệ)          ║
║  DNTT0006 — Returned       (trả về - thiếu báo giá)             ║
║  DNTT0007 — Cancelled      (hủy bởi người tạo)                  ║
║  DNTT0008 — Approved       (35tr, HĐ + BG + nghiệm thu)         ║
║  DNTT0009 — Submitted      (3.8tr, HĐ nộp sau)                  ║
║  DNTT0010 — Closed         (5tr, đã vào kế hoạch)               ║
╠══════════════════════════════════════════════════════════════════╣
║  KẾ HOẠCH THANH TOÁN                                            ║
╠══════════════════════════════════════════════════════════════════╣
║  KHTT0001 — PendingChiefAccountant (49.5tr, chờ KTT duyệt)      ║
║  KHTT0002 — Approved               (5tr, KTT + GĐ đã duyệt)     ║
╠══════════════════════════════════════════════════════════════════╣
║  TẠM ỨNG                                                        ║
╠══════════════════════════════════════════════════════════════════╣
║  TU0001 — Draft    (10tr, công tác TPHCM)                       ║
║  TU0002 — Approved (4tr, vật tư khẩn cấp)                       ║
╚══════════════════════════════════════════════════════════════════╝
`)
}

main()
  .catch((e) => { console.error("❌ Demo seed failed:", e); process.exit(1) })
  .finally(() => prisma.$disconnect())
