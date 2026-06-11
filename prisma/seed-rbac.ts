/**
 * RBAC Seed Script — Run once after migration to populate:
 * 1. System Roles (Admin, Staff, DeptHead, etc.)
 * 2. Permissions (resource.action pairs)
 * 3. RolePermission mappings (which role gets which permissions)
 * 4. Migrate existing users from legacy `role` field to `UserRole` table
 * 5. Create default WorkflowConfig for each company
 *
 * Usage: npx tsx prisma/seed-rbac.ts
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

// ─── 1. SYSTEM ROLES ─────────────────────────────────────────────────────────

const SYSTEM_ROLES = [
  { name: "Admin",           displayName: "Quản trị viên",  color: "#ef4444", level: 100, isSystem: true },
  { name: "Director",        displayName: "Giám đốc",       color: "#eab308", level: 90,  isSystem: true },
  { name: "ChiefAccountant", displayName: "Kế toán trưởng", color: "#a855f7", level: 80,  isSystem: true },
  { name: "DeptHead",        displayName: "Trưởng phòng",   color: "#3b82f6", level: 70,  isSystem: true },
  { name: "Accountant",      displayName: "Kế toán",        color: "#8b5cf6", level: 60,  isSystem: true },
  { name: "Purchasing",      displayName: "Mua hàng",       color: "#10b981", level: 50,  isSystem: true },
  { name: "Warehouse",       displayName: "Thủ kho",        color: "#f59e0b", level: 40,  isSystem: true },
  { name: "Staff",           displayName: "Nhân viên",      color: "#64748b", level: 10,  isSystem: true },
]

// ─── 2. PERMISSIONS ──────────────────────────────────────────────────────────

const RESOURCES = [
  "dashboard", "company", "department", "user",
  "vendor", "materialItem",
  "procurementPlan", "materialRequest", "purchaseRequest",
  "paymentRequest", "advanceRequest", "paymentPlan", "settlement",
  "inventoryCheck", "notification",
  "admin", // meta-permission for admin panel
]

const ACTIONS = ["create", "read", "update", "delete", "approve", "submit"]

// Generate full permission matrix
function generatePermissions() {
  const perms: { resource: string; action: string; displayName: string }[] = []

  for (const resource of RESOURCES) {
    const actions = resource === "admin"
      ? ["full", "access"]
      : resource === "dashboard" || resource === "notification"
        ? ["read"]
        : ACTIONS

    for (const action of actions) {
      perms.push({
        resource,
        action,
        displayName: `${action} ${resource}`,
      })
    }
  }
  return perms
}

// ─── 3. ROLE→PERMISSION MAPPINGS ──────────────────────────────────────────────

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: ["admin.full", "admin.access"], // Admin gets ALL permissions via engine check
  Director: [
    "dashboard.read", "company.read", "department.read", "user.read",
    "procurementPlan.read", "procurementPlan.approve",
    "materialRequest.read",
    "purchaseRequest.read",
    "paymentRequest.read", "paymentRequest.approve",
    "advanceRequest.read", "advanceRequest.approve",
    "paymentPlan.read", "paymentPlan.approve",
    "settlement.read", "settlement.approve",
    "notification.read",
  ],
  ChiefAccountant: [
    "dashboard.read", "company.read", "department.read", "user.read",
    "vendor.read",
    "paymentRequest.read", "paymentRequest.create", "paymentRequest.update", "paymentRequest.approve",
    "advanceRequest.read", "advanceRequest.approve",
    "paymentPlan.read", "paymentPlan.create", "paymentPlan.update", "paymentPlan.approve",
    "settlement.read", "settlement.approve",
    "notification.read",
  ],
  DeptHead: [
    "dashboard.read",
    "procurementPlan.read", "procurementPlan.create", "procurementPlan.update", "procurementPlan.approve",
    "materialRequest.read", "materialRequest.create", "materialRequest.update", "materialRequest.approve",
    "purchaseRequest.read", "purchaseRequest.approve",
    "paymentRequest.read", "paymentRequest.create", "paymentRequest.update", "paymentRequest.approve",
    "advanceRequest.read", "advanceRequest.create", "advanceRequest.update", "advanceRequest.approve",
    "settlement.read", "settlement.approve",
    "notification.read",
  ],
  Accountant: [
    "dashboard.read",
    "vendor.read",
    "materialItem.read",
    "purchaseRequest.read",
    "paymentRequest.read", "paymentRequest.create", "paymentRequest.update",
    "paymentPlan.read",
    "settlement.read",
    "notification.read",
  ],
  Purchasing: [
    "dashboard.read",
    "vendor.read", "vendor.create", "vendor.update",
    "materialItem.read",
    "purchaseRequest.read", "purchaseRequest.create", "purchaseRequest.update",
    "paymentRequest.read",
    "notification.read",
  ],
  Warehouse: [
    "dashboard.read",
    "materialItem.read", "materialItem.create", "materialItem.update",
    "materialRequest.read",
    "inventoryCheck.read", "inventoryCheck.create",
    "purchaseRequest.read",
    "notification.read",
  ],
  Staff: [
    "dashboard.read",
    "procurementPlan.read", "procurementPlan.create",
    "materialRequest.read", "materialRequest.create",
    "paymentRequest.read", "paymentRequest.create",
    "advanceRequest.read", "advanceRequest.create",
    "settlement.read",
    "notification.read",
  ],
}

// ─── 4. DEFAULT WORKFLOW CONFIGS ──────────────────────────────────────────────

function getDefaultWorkflows(companyId: string, roleMap: Map<string, string>) {
  return [
    {
      entityType: "paymentRequest",
      name: "Luồng Đề nghị Thanh toán",
      description: "Luồng phê duyệt chuẩn cho đề nghị thanh toán",
      companyId,
      steps: [
        { stepOrder: 1, name: "Kế toán kiểm tra", type: "check",   actorRoleId: roleMap.get("Accountant")!, icon: "🔎", conditionType: "always" },
        { stepOrder: 2, name: "Trưởng BP duyệt",  type: "approve", actorRoleId: roleMap.get("DeptHead")!,   icon: "✍️", conditionType: "always" },
        { stepOrder: 3, name: "KTT duyệt",         type: "approve", actorRoleId: roleMap.get("ChiefAccountant")!, icon: "✍️", conditionType: "condition", conditionParam: "amount", conditionOp: ">=", conditionValue: "1000000" },
        { stepOrder: 4, name: "GĐ phê duyệt",     type: "approve", actorRoleId: roleMap.get("Director")!,   icon: "✍️", conditionType: "condition", conditionParam: "amount", conditionOp: ">=", conditionValue: "5000000" },
      ],
    },
    {
      entityType: "advanceRequest",
      name: "Luồng Đề nghị Tạm ứng",
      description: "Luồng phê duyệt chuẩn cho đề nghị tạm ứng",
      companyId,
      steps: [
        { stepOrder: 1, name: "Trưởng BP duyệt",  type: "approve", actorRoleId: roleMap.get("DeptHead")!,   icon: "✍️", conditionType: "always" },
        { stepOrder: 2, name: "KTT duyệt",         type: "approve", actorRoleId: roleMap.get("ChiefAccountant")!, icon: "✍️", conditionType: "condition", conditionParam: "amount", conditionOp: ">=", conditionValue: "1000000" },
        { stepOrder: 3, name: "GĐ phê duyệt",     type: "approve", actorRoleId: roleMap.get("Director")!,   icon: "✍️", conditionType: "condition", conditionParam: "amount", conditionOp: ">=", conditionValue: "5000000" },
      ],
    },
    {
      entityType: "procurementPlan",
      name: "Luồng Hồ sơ Mua sắm",
      description: "Luồng phê duyệt cho hồ sơ / hợp đồng mua sắm",
      companyId,
      steps: [
        { stepOrder: 1, name: "Trưởng BP duyệt",  type: "approve", actorRoleId: roleMap.get("DeptHead")!, icon: "✍️", conditionType: "always" },
        { stepOrder: 2, name: "GĐ phê duyệt",     type: "approve", actorRoleId: roleMap.get("Director")!, icon: "✍️", conditionType: "always" },
      ],
    },
    {
      entityType: "materialRequest",
      name: "Luồng Yêu cầu Cấp vật tư",
      companyId,
      steps: [
        { stepOrder: 1, name: "Trưởng BP duyệt",  type: "approve", actorRoleId: roleMap.get("DeptHead")!, icon: "✍️", conditionType: "always" },
      ],
    },
  ]
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("🔐 Starting RBAC seed...")

  // ─── Step 1: Upsert Roles ────────────────────────────────────────────────
  console.log("\n📋 Step 1: Creating system roles...")
  const roleMap = new Map<string, string>()

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleDef.name },
      create: roleDef,
      update: { displayName: roleDef.displayName, color: roleDef.color, level: roleDef.level },
    })
    roleMap.set(role.name, role.id)
    console.log(`  ✅ Role: ${role.displayName} (${role.name}) → ${role.id}`)
  }

  // ─── Step 2: Upsert Permissions ──────────────────────────────────────────
  console.log("\n🔑 Step 2: Creating permissions...")
  const permissions = generatePermissions()
  const permMap = new Map<string, string>()

  for (const permDef of permissions) {
    const perm = await prisma.permission.upsert({
      where: {
        resource_action: { resource: permDef.resource, action: permDef.action },
      },
      create: permDef,
      update: { displayName: permDef.displayName },
    })
    permMap.set(`${perm.resource}.${perm.action}`, perm.id)
  }
  console.log(`  ✅ Created ${permissions.length} permissions`)

  // ─── Step 3: Create RolePermission mappings ──────────────────────────────
  console.log("\n🔗 Step 3: Linking roles to permissions...")
  for (const [roleName, permKeys] of Object.entries(ROLE_PERMISSIONS)) {
    const roleId = roleMap.get(roleName)
    if (!roleId) continue

    // Clear existing
    await prisma.rolePermission.deleteMany({ where: { roleId } })

    const entries = permKeys
      .map(key => ({ roleId, permissionId: permMap.get(key)! }))
      .filter(e => e.permissionId)

    if (entries.length > 0) {
      await prisma.rolePermission.createMany({ data: entries })
    }
    console.log(`  ✅ ${roleName}: ${entries.length} permissions`)
  }

  // ─── Step 4: Migrate existing users ──────────────────────────────────────
  console.log("\n👤 Step 4: Migrating users to UserRole...")
  const users = await prisma.user.findMany({
    select: { id: true, role: true, email: true },
  })

  let migrated = 0
  for (const user of users) {
    if (!user.role) continue

    const existingUR = await prisma.userRole.findFirst({
      where: { userId: user.id },
    })
    if (existingUR) continue // Already migrated

    const targetRoleId = roleMap.get(user.role)
    if (!targetRoleId) {
      console.log(`  ⚠️ Unknown role "${user.role}" for user ${user.email}, skipping`)
      continue
    }

    await prisma.userRole.create({
      data: { userId: user.id, roleId: targetRoleId },
    })
    migrated++
  }
  console.log(`  ✅ Migrated ${migrated}/${users.length} users`)

  // ─── Step 5: Create default workflows ────────────────────────────────────
  console.log("\n⚙️ Step 5: Creating default workflow configs...")
  const companies = await prisma.company.findMany({ select: { id: true, code: true } })

  for (const company of companies) {
    const workflows = getDefaultWorkflows(company.id, roleMap)

    for (const wf of workflows) {
      const exists = await prisma.workflowConfig.findFirst({
        where: { entityType: wf.entityType, companyId: wf.companyId },
      })
      if (exists) {
        console.log(`  ⏭️ ${company.code}/${wf.entityType} already exists`)
        continue
      }

      await prisma.workflowConfig.create({
        data: {
          entityType: wf.entityType,
          name: wf.name,
          description: wf.description || null,
          companyId: wf.companyId,
          steps: {
            create: wf.steps.map(s => ({
              stepOrder: s.stepOrder,
              name: s.name,
              type: s.type,
              actorRoleId: s.actorRoleId,
              icon: s.icon || null,
              conditionType: s.conditionType,
              conditionParam: s.conditionParam || null,
              conditionOp: s.conditionOp || null,
              conditionValue: s.conditionValue || null,
            })),
          },
        },
      })
      console.log(`  ✅ ${company.code}/${wf.entityType}: ${wf.steps.length} steps`)
    }
  }

  console.log("\n🎉 RBAC seed complete!")
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
