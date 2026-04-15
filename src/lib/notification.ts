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
  action: "submitted" | "approved" | "rejected" | "returned" | "cancelled"
  actor: string           // person who performed the action
  comment?: string | null
  recipients: WorkflowRecipient[]
}

const ACTION_LABELS: Record<WorkflowNotifyOptions["action"], string> = {
  submitted: "đã trình duyệt",
  approved: "đã được phê duyệt",
  rejected: "đã bị từ chối",
  returned: "đã bị trả lại",
  cancelled: "đã bị hủy",
}

export async function notifyWorkflow(options: WorkflowNotifyOptions): Promise<void> {
  const { entityCode, entityLabel, action, actor, comment, recipients } = options

  const label = ACTION_LABELS[action]
  const title = `[1Gate] ${entityLabel} ${entityCode} ${label}`
  let body = `${entityLabel} mã <b>${entityCode}</b> ${label} bởi <b>${actor}</b>.`
  if (comment) body += `\n\nNhận xét: ${comment}`

  await Promise.allSettled(
    recipients.map((r) =>
      notify({
        title: title.replace(/<b>|<\/b>/g, ""),
        body: body.replace(/<b>|<\/b>/g, ""),
        userId: r.id,
        email: r.email,
        telegramChatId: r.telegramChatId || "1005223428", // Fake real telegram for testing
      })
    )
  )
}
