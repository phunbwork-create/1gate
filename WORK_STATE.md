# 1Gate - WORK STATE

## Current Sprint: Sprint 5 — Notifications & Dashboard ✅ COMPLETED

### Sprint 5 Status: DONE
- [x] **Phase 1**: Notification Engine (Email/Telegram/In-App)
  - `src/lib/notification.ts` — Core engine with Resend, Telegram Bot API, Prisma In-App
  - `src/components/layout/notification-bell.tsx` — Bell icon with dropdown, unread count, mark-as-read
  - `src/app/api/notifications/my/route.ts` — GET my notifications
  - `src/app/api/notifications/[id]/read/route.ts` — POST mark as read
- [x] **Phase 2**: Workflow Integration (ALL 7 modules)
  - Procurement: submit → notify DeptHead, approve → notify creator
  - Material Request: submit → notify DeptHead, approve → notify creator
  - Purchase Request: submit → notify DeptHead, approve → notify creator
  - Payment Request: submit → notify Accountant, approve → notify creator
  - Advance Request: submit → notify chain[0], approve → notify creator
  - Payment Plan: submit → notify ChiefAccountant, approve → notify creator + Director
  - Settlement: submit → notify Accountant, approve → notify creator
- [x] **Phase 3**: Dashboard
  - `src/app/api/dashboard/route.ts` — KPI stats API
  - `src/app/(main)/dashboard/page.tsx` — Recharts LineChart + KPI cards + recent activity

### Completed Sprints
- Sprint 1: Auth, RBAC, Company/User CRUD ✅
- Sprint 2: Procurement, Material Request, Purchase Request ✅
- Sprint 3: Payment Request + Approval Workflow ✅
- Sprint 4: Advance Request, Payment Plan, Settlement ✅
- Sprint 5: Notifications & Dashboard ✅

## Hotfix / Bổ sung sau Sprint 5

- [x] **Upload chứng từ (Attachment feature):**
  - `POST /api/attachments` — upload multipart/form-data, lưu file vào `public/uploads/{entityType}/{entityId}/`, lưu metadata vào DB (`Attachment` model)
  - `DELETE /api/attachments/[id]` — xóa file vật lý + DB record (fail-safe nếu file đã mất)
  - `src/components/business/attachment-panel.tsx` — component dùng chung:
    - Hiển thị danh sách file: icon theo loại (PDF/ảnh/Excel/Word), tên, kích thước, ngày upload, link mở tab mới
    - Button "Đính kèm tệp": click chọn file, validate size/type client-side, upload, tự refresh
    - Button xóa: confirm dialog → xóa file + record
    - `canUpload` = owner + chưa lock (`!isLocked && isOwner`)
  - Tích hợp vào `/payments/[id]/page.tsx`:
    - Accordion "Chứng từ đính kèm" (mở mặc định)
    - Badge count, cảnh báo "(bắt buộc)" khi amount >5tr chưa có file
    - Hint: >5tr cần Báo giá, >20tr cần Hợp đồng
  - Tích hợp vào `/advances/[id]/page.tsx`:
    - Accordion "Chứng từ đính kèm" (mở mặc định)
  - Submit route ĐNTT enforce đúng: >5tr → "Báo giá", >20tr → "Hợp đồng"
  - **Giới hạn file:** PDF, ảnh (jpg/png/webp), Word (.doc/.docx), Excel (.xls/.xlsx), tối đa 10MB/file
  - **Note:** `public/uploads/` tự tạo khi upload đầu tiên (mkdir recursive)

## Tech Stack
- Next.js 14 (App Router) + TypeScript
- Prisma ORM + PostgreSQL (Prisma Postgres local)
- NextAuth.js (Credentials)
- Shadcn/ui + Recharts
- Resend (Email) + Telegram Bot API
