# Project Conventions (1Gate App)

Tài liệu này định nghĩa các quy chuẩn lập trình (Coding Conventions), Kiến trúc (Architecture) và Phong cách viết code (Style Guide) đang được áp dụng trong dự án `1Gate App`. Các AI Model hoặc Lập trình viên khi tham gia vào dự án cần đọc và tuân thủ tuyệt đối các quy định này để duy trì sự đồng nhất của Source Code.

---

## 1. Naming Convention (Quy tắc đặt tên)

- **Thư mục & File (Files/Folders):** Sử dụng `kebab-case`.
  - *Ví dụ:* `status-badge.tsx`, `business.schema.ts`, `approval-timeline.tsx`.
  - Đặc biệt tuân thủ Next.js App Router với các file mấu chốt: `page.tsx`, `layout.tsx`, `route.ts`.
- **React Components & Interfaces/Types:** Sử dụng `PascalCase`.
  - *Ví dụ:* `ApprovalTimeline`, `StatusBadge`, `export interface PlanDetail { ... }`.
- **Biến (Variables) & Hàm (Functions):** Sử dụng `camelCase`.
  - *Ví dụ:* `fetchReq`, `handleApprove`, `currentStepIndex`, `isLoading`.
- **Hằng số (Constants):** Sử dụng `UPPER_SNAKE_CASE` kết hợp với từ khóa `const`.
  - *Ví dụ:* `REQUEST_STATUS_CONFIG`, `MAX_FILE_SIZE`.

---

## 2. Architecture (Kiến trúc dự án)

Dự án đang theo mô hình **Monolithic / Fullstack Serverless** sử dụng **Next.js 14+ App Router**. 

Cấu trúc thư mục lõi tuân thủ chặt chẽ:
- `src/app`: Chứa cấu trúc Routing của Cả Frontend (`page.tsx`) lẫn Backend (`api/.../route.ts`).
  - Phân tách Layout: `(auth)` cho logic đăng nhập, `(main)` cho các luồng nghiệp vụ chính có thanh điều hướng bảo vệ.
- `src/components`: Chia làm 2 nhóm:
  - `ui`: Chứa các atom components thuần túy sinh ra từ `shadcn-ui` (Button, Dialog, Accordion,...). **[Chỉ đọc, không custom logic rườm rà ở đây]**.
  - `business`: Chứa các Component mang logic nghiệp vụ đặc thù gắn liền với model (VD: `ApprovalTimeline`, `StatusBadge`).
- `src/lib`: Các tiện ích cấu hình và Helper Functions phi trạng thái (như `prisma.ts`, `api-helpers.ts`).
- `src/schemas`: Tập trung toàn bộ file config Zod Validation (`business.schema.ts`).
- **Database Layer:** Sử dụng **Prisma ORM** tương tác với PostgreSQL.

---

## 3. Coding Style (Phong cách code)

### 3.1. Function Declaration
- **React Components:** Sử dụng `export function ComponentName() { ... }` (Standard Function) làm top-level thay vì gán Arrow function cho biến.
  - *Đúng:* `export default function PurchaseRequestDetailPage() { ... }`
- **Internal / Callback Functions:** Sử dụng Arrow functions `() => {}` khi truyền vào hàm map, filter hoặc các event object (`onClick={() => ...}`).

### 3.2. Error Handling & API (Backend)
- Toàn bộ hàm Server API (GET, POST, PATCH) phải bọc logic trong khối `try...catch`.
- Bỏ qua việc return thủ công đối tượng `NextResponse`. Bắt buộc dùng Generic Wrapper từ `@/lib/api-helpers.ts`:
  - Trả về thành công: `return success(data)`
  - Lỗi bad request: `return badRequest("Thông báo")`
  - Lỗi không tìm thấy: `return notFound("...")`
  - Lỗi server (Catch block): `return serverError()`

### 3.3. API Fetching (Frontend)
- Hệ thống **ưu tiên sử dụng Native `fetch` API** kết hợp `async/await` bên trong thẻ `try-catch` (chưa sử dụng thư viện thứ 3 như Axios để giữ bundle size nguyên trạng từ Next.js).
- Quản lý trạng thái bằng `useState` và tự động fetch bằng `useEffect`.
- Đảm bảo có block `finally { setLoading(false) }` trong quá trình tải dữ liệu.

### 3.4. Forms & Validation
- Validation được kiểm soát chặt tại Frontend lẫn Backend.
- Sử dụng **Zod** (`zod`) làm single source of truth cho schema kết hợp **React-Hook-Form** (`react-hook-form`).

---

## 4. Code Formatting (Định dạng code)

- **Dấu chấm phẩy (Semicolons):** Style **không sử dụng dấu chấm phẩy (No Semicolons)** ở cuối dòng statement. (Giống tiêu chuẩn StandardJS v/v Next.js template).
- **Thụt lề (Indentation):** **2 spaces** (Dấu cách). Không dùng Tab.
- **Dấu ngoặc kép (Quotes):** Sử dụng Double Quotes (`"..."`) cho Strings và JSX attributes.
- **Styling Classes:** Dùng cú pháp của Tailwind CSS (`className="flex gap-4 p-4"`). Nếu có logic động, nối chuỗi Template Literal hoặc có thể dùng `clsx`/`tailwind-merge` (đã khai báo trong package.json).
