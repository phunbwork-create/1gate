/**
 * Settlement Auto-Generation Helper
 * 
 * Tập trung toàn bộ logic tự động sinh Quyết toán (Settlement) vào 1 file duy nhất.
 * Khi Kế toán trưởng phản hồi, chỉ cần sửa file này:
 *   - Thay đổi trigger (lúc Approve → lúc Thực chi): đổi chỗ gọi hàm
 *   - Thay đổi rules (chỉ áp dụng > 10 triệu): sửa hàm shouldAutoGenerate
 *   - Thêm người duyệt: sửa approval chain config
 */

import { SettlementSourceType } from "@prisma/client"

// ─── CONFIG: Dễ dàng thay đổi sau ────────────────────────────────
// Prefix mã quyết toán theo từng loại nguồn
const SOURCE_CODE_PREFIX: Record<SettlementSourceType, string> = {
  AdvanceRequest: "QT-TU",
  PaymentRequest: "QT-TT",
  PurchaseRequest: "QT-MH",
  MaterialRequest: "QT-VT",
}

// Label hiển thị cho mỗi loại nguồn
export const SOURCE_LABEL: Record<SettlementSourceType, string> = {
  AdvanceRequest: "Tạm ứng",
  PaymentRequest: "Thanh toán",
  PurchaseRequest: "Mua hàng",
  MaterialRequest: "Cấp vật tư",
}

// ─── TYPES ────────────────────────────────────────────────────────

export interface AutoSettlementConfig {
  sourceType: SettlementSourceType
  sourceId: string
  sourceCode: string
  createdById: string
  /** Số tiền gốc của đề xuất (nếu có). Dùng cho Tạm ứng/Thanh toán */
  amount?: number
}

// ─── RULES: Có cần sinh Quyết toán không? ─────────────────────────
// TODO: Chỉnh sửa theo feedback Kế toán trưởng
// Ví dụ: chỉ áp dụng cho amount > 5 triệu, hoặc chỉ áp dụng cho một số loại

export function shouldAutoGenerate(_config: AutoSettlementConfig): boolean {
  // Hiện tại: LUÔN sinh Quyết toán cho mọi Đề xuất được duyệt
  // Sau này có thể thêm điều kiện:
  // if (config.sourceType === "MaterialRequest" && config.amount < 5_000_000) return false
  return true
}

// ─── CODE GENERATOR ──────────────────────────────────────────────

function generateSettlementCode(sourceType: SettlementSourceType, existingCount: number): string {
  const today = new Date()
  const yy = today.getFullYear().toString().slice(2)
  const mm = (today.getMonth() + 1).toString().padStart(2, "0")
  const dd = today.getDate().toString().padStart(2, "0")
  const seq = (existingCount + 1).toString().padStart(4, "0")
  return `${SOURCE_CODE_PREFIX[sourceType]}${yy}${mm}${dd}${seq}`
}

// ─── MAIN: Auto-generate Settlement ──────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function autoGenerateSettlement(tx: any, config: AutoSettlementConfig) {
  if (!shouldAutoGenerate(config)) return null

  const { sourceType, sourceId, sourceCode, createdById } = config

  // Generate unique code
  const prefix = SOURCE_CODE_PREFIX[sourceType]
  const today = new Date()
  const yy = today.getFullYear().toString().slice(2)
  const mm = (today.getMonth() + 1).toString().padStart(2, "0")
  const dd = today.getDate().toString().padStart(2, "0")
  const codePrefix = `${prefix}${yy}${mm}${dd}`

  const existingCount = await tx.settlement.count({
    where: { code: { startsWith: codePrefix } },
  })

  const code = generateSettlementCode(sourceType, existingCount)

  // Build the FK link based on sourceType
  const sourceLink: Record<string, string> = {}
  switch (sourceType) {
    case "AdvanceRequest":
      sourceLink.advanceRequestId = sourceId
      break
    case "PaymentRequest":
      sourceLink.paymentRequestId = sourceId
      break
    case "PurchaseRequest":
      sourceLink.purchaseRequestId = sourceId
      break
    case "MaterialRequest":
      sourceLink.materialRequestId = sourceId
      break
  }

  // Auto-generate title
  const label = SOURCE_LABEL[sourceType]
  const title = `Quyết toán ${label} ${sourceCode}`

  const settlement = await tx.settlement.create({
    data: {
      code,
      title,
      sourceType,
      createdById,
      status: "Draft",
      ...sourceLink,
    },
  })

  return settlement
}

// ─── PENALTY LOGIC ───────────────────────────────────────────────
// Kiểm tra xem User có nợ Quyết toán quá hạn không
// Nếu có, return true. Logic:
// 1. Lọc các AdvanceRequest của user (đã được execute qua PaymentVoucher)
//    - Tức là nằm trong một PaymentPlan đã "Executed" (có PaymentVoucher.executedAt)
//    - Hoặc lấy trực tiếp từ PaymentVoucher -> PaymentPlanItem -> AdvanceRequest
// 2. Chưa có Settlement liên kết mà status = "Closed"
// 3. Quá hạn X ngày (hardcode tạm 7 ngày)
// TODO: Tương tự cho MaterialRequest (dựa trên InventoryCheck.checkedAt)

export async function checkOverdueSettlements(
  userId: string,
  companyId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any = null
): Promise<boolean> {
  const db = tx || (await import("@/lib/prisma")).default;
  const deadlineDays = 7;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - deadlineDays);

  // Tìm các phiếu tạm ứng của user chưa được quyết toán xong
  const overdueAdvances = await db.advanceRequest.findFirst({
    where: {
      createdById: userId,
      companyId: companyId,
      // Đã giải ngân (tìm qua PaymentPlanItem -> PaymentVoucher)
      paymentPlanItems: {
        some: {
          plan: {
            status: "Executed",
            paymentVouchers: {
              some: {
                executedAt: {
                  lt: cutoffDate, // Quá hạn
                },
              },
            },
          },
        },
      },
      // CHƯA có quyết toán hợp lệ (không có SettlementItem nào trỏ tới Settlement đã Closed)
      settlementItems: {
        none: {
          settlement: {
            status: "Closed",
          },
        },
      },
    },
  });

  if (overdueAdvances) return true;

  return false;
}

