/**
 * Notification service — Email (Resend) + Telegram Bot
 * All workflow events must trigger BOTH channels where configured.
 */

// ─── TYPES ───────────────────────────────────────────────────────────────────

export interface NotifyPayload {
  title: string
  body: string
  userId?: string
  email?: string
  telegramChatId?: string
}

// ─── EMAIL ───────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || "1Gate <noreply@1gate.app>"

  if (!apiKey) {
    console.warn("[Notification] RESEND_API_KEY not configured — skipping email")
    return
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("[Notification] Email send failed:", err)
    }
  } catch (err) {
    console.error("[Notification] Email error:", err)
  }
}

// ─── TELEGRAM ────────────────────────────────────────────────────────────────

async function sendTelegram(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN

  if (!token) {
    console.log("\n========================= [TELEGRAM MOCK] =========================")
    console.log(`TO CHAT ID: ${chatId}`)
    console.log(`MESSAGE:\n${text.replace(/<[^>]+>/g, "")}`) // strip HTML for console
    console.log("===================================================================\n")
    return
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("[Notification] Telegram send failed:", err)
    }
  } catch (err) {
    console.error("[Notification] Telegram error:", err)
  }
}

// ─── DB LOG ──────────────────────────────────────────────────────────────────

async function saveNotification(userId: string, channel: "Email" | "Telegram", title: string, body: string) {
  try {
    // Lazy import to avoid circular dependency
    const { default: prisma } = await import("@/lib/prisma")
    await prisma.notification.create({
      data: { userId, channel, title, body, sentAt: new Date() },
    })
  } catch (err) {
    console.error("[Notification] DB save error:", err)
  }
}

// ─── MAIN SEND ───────────────────────────────────────────────────────────────

/**
 * Send notification via all configured channels.
 * Fails silently — never block the main workflow on notification errors.
 */
export async function notify(payload: NotifyPayload): Promise<void> {
  const { title, body, userId, email, telegramChatId } = payload

  const htmlBody = `
    <div style="font-family:sans-serif;max-width:560px">
      <h2 style="color:#1e40af">${title}</h2>
      <p style="color:#374151;white-space:pre-wrap">${body}</p>
      <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb"/>
      <p style="color:#9ca3af;font-size:12px">1Gate System — Thông báo tự động</p>
    </div>
  `

  const telegramText = `<b>${title}</b>\n\n${body}`

  const tasks: Promise<void>[] = []

  if (email) {
    tasks.push(sendEmail(email, title, htmlBody))
    if (userId) tasks.push(saveNotification(userId, "Email", title, body))
  }

  if (telegramChatId) {
    tasks.push(sendTelegram(telegramChatId, telegramText))
    if (userId) tasks.push(saveNotification(userId, "Telegram", title, body))
  }

  await Promise.allSettled(tasks)
}

// ─── WORKFLOW NOTIFICATION HELPERS ───────────────────────────────────────────

export interface WorkflowRecipient {
  id: string
  name: string
  email: string
  telegramChatId?: string | null
}

export interface WorkflowNotifyOptions {
  entityCode: string
  entityLabel: string     // "Đề nghị Thanh toán", "Đề nghị Tạm ứng", etc.
  /**
   * Hỗ trợ cả dạng động từ thô ("approve","reject","return","cancel")
   * lẫn dạng đã xử lý ("approved","rejected","returned","cancelled","submitted")
   * để tránh lỗi undefined khi value từ DB khác convention.
   */
  action: string
  actor: string           // person who performed the action
  comment?: string | null
  recipients: WorkflowRecipient[]
}

/** Chuẩn hóa action từ DB ("approve","reject","return") → key đồng nhất */
function normalizeAction(
  raw: string
): "submitted" | "approved" | "rejected" | "returned" | "cancelled" {
  const map: Record<string, "submitted" | "approved" | "rejected" | "returned" | "cancelled"> = {
    submit:    "submitted",
    submitted: "submitted",
    approve:   "approved",
    approved:  "approved",
    reject:    "rejected",
    rejected:  "rejected",
    return:    "returned",
    returned:  "returned",
    cancel:    "cancelled",
    cancelled: "cancelled",
  }
  return map[raw] ?? "submitted"
}

export async function notifyWorkflow(options: WorkflowNotifyOptions): Promise<void> {
  const { entityCode, entityLabel, actor, comment, recipients } = options
  const action = normalizeAction(options.action)

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"

  // ─── Title ngắn gọn ─────────────────────────────────────────────────────────
  const ACTION_TITLE: Record<typeof action, string> = {
    submitted: "⏳ Chờ phê duyệt",
    approved:  "✅ Đã phê duyệt",
    rejected:  "❌ Đã từ chối",
    returned:  "🔄 Trả lại — cần bổ sung",
    cancelled: "⛔ Đã hủy",
  }
  const title = `[1Gate] ${entityLabel} ${entityCode} — ${ACTION_TITLE[action]}`

  // ─── Body chi tiết, nói rõ cần làm gì ──────────────────────────────────────
  let body = ""

  if (action === "submitted") {
    body =
      `📋 ${entityLabel} <b>${entityCode}</b> vừa được trình duyệt bởi <b>${actor}</b>.\n\n` +
      `👉 Việc cần làm: Đăng nhập hệ thống, mở phiếu và thực hiện phê duyệt.\n` +
      `🔗 ${appUrl}`
  } else if (action === "approved") {
    body =
      `✅ ${entityLabel} <b>${entityCode}</b> đã được phê duyệt bởi <b>${actor}</b>.\n\n` +
      `Phiếu của bạn đã qua bước duyệt, không cần thao tác thêm.`
    if (comment) body += `\n\n💬 Nhận xét: <i>${comment}</i>`
  } else if (action === "rejected") {
    body =
      `❌ ${entityLabel} <b>${entityCode}</b> đã bị từ chối bởi <b>${actor}</b>.\n\n` +
      `👉 Việc cần làm: Xem lý do từ chối bên dưới, liên hệ kế toán nếu cần làm rõ.\n` +
      `🔗 ${appUrl}`
    if (comment) body += `\n\n💬 Lý do từ chối: <i>${comment}</i>`
  } else if (action === "returned") {
    body =
      `🔄 ${entityLabel} <b>${entityCode}</b> đã bị trả lại bởi <b>${actor}</b>.\n\n` +
      `👉 Việc cần làm: Đăng nhập, bổ sung thông tin còn thiếu rồi trình duyệt lại.\n` +
      `🔗 ${appUrl}`
    if (comment) body += `\n\n💬 Yêu cầu bổ sung: <i>${comment}</i>`
  } else if (action === "cancelled") {
    body = `⛔ ${entityLabel} <b>${entityCode}</b> đã bị hủy bởi <b>${actor}</b>.`
    if (comment) body += `\n\n💬 Lý do: <i>${comment}</i>`
  }

  // Fallback chat ID cho môi trường dev/test (set trong .env)
  const devChatId = process.env.TELEGRAM_DEFAULT_CHAT_ID

  await Promise.allSettled(
    recipients.map((r) => {
      const chatId = r.telegramChatId || devChatId || undefined
      if (!chatId) {
        console.warn(
          `[Notification] User ${r.name} (${r.email}) chưa cài telegramChatId.`,
          `Set TELEGRAM_DEFAULT_CHAT_ID trong .env để nhận thông báo khi test.`
        )
      }
      return notify({
        title: title.replace(/<[^>]+>/g, ""),
        body:  body.replace(/<[^>]+>/g, ""),
        userId: r.id,
        email: r.email,
        telegramChatId: chatId,
      })
    })
  )
}
