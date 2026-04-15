# Sơ đồ Cấu trúc Dự án (PROJECT_MAP)

Tài liệu này đóng vai trò như một bản đồ tổng quan, giúp các thành viên mới hoặc AI models nắm bắt kiến trúc và định hướng của dự án `1Gate App` trong vài phút.

---

## 1. Project Name & Goal (Mục tiêu dự án)
- **Tên dự án:** 1Gate App (Portal Nội bộ Tập trung).
- **Mục tiêu chính:** 1Gate hướng đến việc chuyển đổi số các quy trình lõi trong tổ chức, trong đó tập trung vào phân hệ Phê duyệt và Mua sắm (Approval & Procurement workflow). Cho phép người dùng khởi tạo, theo dõi luồng duyệt, và kết tủa dữ liệu liên phòng ban (Yêu cầu Mua sắm, Vật tư, Thanh toán) trên một Dashboard thống nhất duy nhất (One Gate).

## 2. Tech Stack (Công nghệ & Thư viện)
Dự án được xây dựng trên một Modern Web Stack hiệu năng cao, fully Typed:
- **Core Framework:** Next.js 14 (Sử dụng App Router) kết hợp React 18.
- **Language:** TypeScript.
- **Database & ORM:** PostgreSQL kết hợp Prisma ORM.
- **Authentication:** Auth.js (NextAuth v5 beta).
- **Styling & UI:** Tailwind CSS, Shadcn-ui (Radix UI) và class-variance-authority. Khắc phục lỗi CSS bằng clsx, tailwind-merge.
- **State & Form Management:** React Hook Form quản lý state form, Zod (Schema validation).
- **Testing:** Jest + Ts-jest, Supertest.

## 3. Project Structure (Cấu trúc thư mục lõi)
Luồng logic của ứng dụng được gói gọn trong thư mục `src/`, tuân thủ kiến trúc phân tầng Layer Separation để dễ bảo trì/mở rộng.

```text
src/
├── app/                  # Next.js App Router (Chứa Routing & Screens)
│   ├── (auth)/           # Route Groups: Dành riêng cho màn hình Authentication (Login).
│   ├── (main)/           # Route Groups: Dành cho Layout chính của hệ thống sau khi đã Login.
│   └── api/              # Chứa các REST API Backend Endpoints (Chạy ở Node.js/Edge server).
├── components/           # Các View Component dùng chung
│   ├── ui/               # Atom Components (Nút bấm, form, modal...) tải trực tiếp từ Shadcn.
│   └── business/         # Domain-driven Components (Các cụm logic như StatusBar, ApprovalTimeline).
├── hooks/                # Chứa Custom React Hooks (VD: useToast, useAuth...).
├── lib/                  # Helpers & API Configs (Khởi tạo kết nối Prisma, hàm tiện ích Server).
├── schemas/              # Các đối tượng Zod xác thực dữ liệu đầu vào (Data Validation Schema).
├── types/                # Type Safety: Cấu trúc interface/type TypeScript toàn cục.
└── __tests__/            # Thư mục mã nguồn Unit Test của Jest.
```
*Ngoài ra, hệ thống cũng có thư mục `prisma/` nằm tại Root để cấu hình Database schema `schema.prisma` và script seeding tự động `seed.ts`.*

## 4. Entry Points (Luồng khởi động)
Mọi file dưới đây đóng vai trò như cửa ngõ điều hướng tổng của toàn app:
1. **Middleware điều phối** -> `src/middleware.ts` 
   - *Rào chắn cổng đầu tiên, xác nhận Session, chặn truy cập chưa được cấp quyền trước khi đến ứng dụng.*
2. **Cấu trúc khung giao diện** -> `src/app/layout.tsx` 
   - *Chứa Global Providers, Layout Header/Sidebar, và Font chữ tổng hệ thống.*
3. **Màn hình đầu vào** -> `src/app/page.tsx` 
   - *Entry-page mặc định (thường redirect sang trang Dashboard khi đã sign-in).*
