# KIẾN TRÚC TÀI LIỆU HƯỚNG DẪN SỬ DỤNG HỆ THỐNG 1GATE

Tài liệu này được phân chia theo từng **Nhóm đối tượng người dùng** để giúp bạn dễ dàng nắm bắt các thao tác nghiệp vụ đặc thù của bộ phận mình.

*(Lưu ý: Các hình ảnh trong tài liệu này là phần giữ chỗ (placeholder), Vận hành dự án vui lòng chụp ảnh màn hình tương ứng và cập nhật lại đường dẫn ảnh cho hoàn thiện).*

---

## PHẦN I: HƯỚNG DẪN CHUNG (TẤT CẢ NGƯỜI DÙNG)

Phần này áp dụng cho mọi cá nhân có tài khoản trên hệ thống 1Gate (Bao gồm cả Nhân viên, Quản trị viên, Giám đốc).

### 1. Đăng nhập và Cập nhật Hồ sơ cá nhân
Người dùng sử dụng Email nội bộ để truy cập hệ thống.
1. Nhập **Email** và **Mật khẩu** (Mặc định: `123456`).
2. Tại màn hình chính, nhấp vào **Hình đại diện (Avatar) góc dưới bên trái**, chọn mục **Hồ sơ cá nhân (Profile)**.

![Giao diện Đăng nhập và Profile](./docs/images/login-profile.png)

### 2. Bảo mật và Nhận thông báo (Cực kỳ quan trọng)
*   **Đổi mật khẩu**: Mật khẩu của hệ thống được mã hóa cao (Bcrypt). Vui lòng đổi mật khẩu ngay trong lần đầu đăng nhập.
*   **Liên kết Telegram**:
    *   Truy cập Telegram của bạn, tìm bot `@RawDataBot` hoặc Bot của công ty.
    *   Lấy mã số `Chat ID` (ví dụ: `1005223428`).
    *   Dán mã này vào mục **Telegram ID** trong Profile và lưu lại để TỰ ĐỘNG nhận tin nhắn từ hệ thống khi có phiếu cần duyệt.

![Hướng dẫn lấy và điền Chat ID Telegram](./docs/images/telegram-setup.png)

### 3. Cách sử dụng tính năng "Lọc Nâng Cao"
Trên mọi trang danh sách (Tạm ứng, Thanh toán, Mua sắm...), hệ thống cung cấp công cụ tìm kiếm mạnh mẽ:
*   **Thanh Search (Tìm kiếm text)**: Tìm theo tên, mã đề nghị, tên Nhà Cấp Cấp.
*   **Menu thả xuống Trạng thái**: Chọn xem các phiếu có trạng thái cụ thể (Nháp, Chờ duyệt, Đã đóng...).
*   **Nút Lọc Nâng Cao (Biểu tượng Sliders)**: Khi bấm vào, một bảng sẽ mở ra cho phép lọc cực kỳ chi tiết:
    *   `Từ ngày / Đến ngày`: Xem các phiếu từ tháng trước.
    *   `Số lượng tiền (Min/Max)`: (Dành cho Phiếu chi) Chỉ hiển thị các hoá đơn từ 10tr đến 50tr.

![Tính năng Filter Nâng cao](./docs/images/advanced-filter.png)

---

## PHẦN II: DÀNH CHO NHÂN VIÊN & QUẢN LÝ (TẠO/DUYỆT ĐỀ NGHỊ)

Đối tượng: Nhân viên kinh doanh, Hành chính nhân sự, Trưởng/Phó phòng ban.

### 1. Khởi tạo Đề nghị Tạm ứng / Thanh toán
Đây là nghiệp vụ diễn ra thường xuyên nhất.
1. Truy cập Menu: **Thanh toán -> Đề nghị Tạm ứng** (hoặc Đề nghị Thanh toán).
2. Nhấn nút **[+ Tạo ĐN mới]**.
3. Khai báo Form: 
   *   Chọn Nhà cung cấp.
   *   Điền Tổng tiền, Thông tin chuyển khoản (STK, Ngân hàng).
   *   Mô tả nội dung lý do thanh toán.
4. Tải lên **Tài liệu đính kèm** (Hóa đơn VAT, Báo giá, Ủy nhiệm chi, Giấy tờ chứng minh).

![Giao diện Tạo Đề nghị Thanh toán](./docs/images/create-payment-request.png)

### 2. Trình duyệt và Phê duyệt
*   **Nhân viên**: Ấn **[Lưu nháp]** nếu chưa chắc chắn, hoặc **[Trình duyệt]** nếu hoàn thành. Phân quyền sẽ xác định Cấp trên trực tiếp của bạn là ai để chuyển thư.
*   **Quản lý (Người duyệt)**: 
    * Bạn sẽ nhận được tin nhắn Telegram (Ví dụ: `[1Gate] Đề nghị Thanh toán mã DNTT0009 bởi Lê Thanh...`).
    * Truy cập trực tiếp vào link trong tin nhắn.
    * Xem kỹ hóa đơn đính kèm và chọn **[Approved (Đồng ý)]** hoặc **[Rejected (Từ chối kèm lý do)]**.

![Thông báo Telegram và Giao diện duyệt](./docs/images/approve-reject-flow.png)

---

## PHẦN III: DÀNH CHO KẾ TOÁN (ACCOUNTANT)

Đối tượng: Chuyên viên Kế toán Nội bộ, Kế toán Trưởng.

Kế toán là chốt chặn cuối cùng kiểm duyệt tiền và lập Phiếu thực chi.

### 1. Phân bổ "Kế hoạch Chi Tiền" (Payment Plans)
Tất cả các "Đề nghị Thanh toán/Tạm ứng" sau khi được duyệt sẽ "nằm chờ" Kế toán xử lý chi tiền. Thay vì chi lắt nhắt, Kế toán sẽ gm chúng vào Kế hoạch chi.
1. Vào **Kế toán -> Kế hoạch chi tiền** -> **[+ Lập KH mới]**.
2. Chọn Ngày dự kiến sẽ chuyển khoản ngân hàng (VD: Thứ 5 hàng tuần).
3. **Thêm mục (Add Items)**: Checkbox tick chọn hàng loạt các "Đề nghị Thanh toán" đã được duyệt hợp lệ.
4. Hệ thống sẽ tự cộng dồn tổng tiền Kế hoạch trình Giám đốc (Director).

![Lập Kế hoạch Chi tiền](./docs/images/payment-plan-creation.png)

### 2. Ghi nhận Thực Chi và Lập Phiếu Chi (Payment Voucher)
Khi Giám đốc đã ký duyệt Kế hoạch chi tiền:
1. Mở xem chi tiết **Kế hoạch Chi tiền**.
2. Ấn nút **[Ghi nhận Thực Chi (Execute)]** ở góc trên cùng.
3. Nhập **Ngày chi tế** và **Ghi chú chuyển khoản/Tiền mặt**.
4. Toàn bộ các Đề nghị bên trong Kế hoạch sẽ được tự động chuyển thành **[Đã đóng/Closed]**.

![Modal Ghi nhận Thực chi](./docs/images/execute-payment.png)

### 3. In và Xuất PDF Phiếu Chi
Từ Kế hoạch chi tiền đã "Thực chi", hệ thống sinh ra một chứng từ gọi là **Phiếu Chi**.
*   Bạn có thể nhấp vào mã phiếu chi. 
*   Tại đây, bấm nút **[In / Lưu PDF]** để in ra khổ A4, xin chữ ký tươi kẹp vào bộ chứng từ đóng file.

![In Phiếu Chi A4](./docs/images/print-voucher.png)

---

## PHẦN IV: DÀNH CHO MUA SẮM VÀ KHO (PURCHASING / WAREHOUSE)

Đối tượng: Chuyên viên Mua sắm (Procurement), Thủ kho.

### 1. Kế hoạch Mua sắm và Cấp Vật tư
*   Kho nhận được **Đề nghị cấp vật tư** của nhân viên.
*   Nếu không có sẵn trong kho, kho sẽ tổng hợp lên **Kế hoạch Mua sắm (Procurement Plan)**.
*   Trong Kế hoạch Mua sắm, điền chi tiết số lượng (Quantity), Đơn vị tính (Unit), và Đơn giá dự kiến (Unit Price).

![Đề nghị Cấp Vật tư và Kế hoạch Mua sắm](./docs/images/materials-procurement.png)

### 2. Xác nhận Đơn giá và Mua hàng
Bên Mua sắm (Purchasing) sẽ tiếp nhận Kế hoạch mua sắm đã duyệt để tạo **Purchase Requests (Đề nghị mua hàng)** với đơn giá thực tế từ nhà cung cấp để chuẩn bị chuyển sang luồng thanh toán.

---

## PHẦN V: DÀNH CHO BAN QUẢN TRỊ (ADMIN)

Đối tượng: System Admin, Giám đốc hệ thống.

Phần này giúp quản lý cấu hình các thực thể danh mục (Master Data) của hệ thống.

### 1. Quản lý Công ty/Chi nhánh
1. Vào **Admin -> Công ty / Chi nhánh**.
2. **Kích hoạt/Hủy kích hoạt**: Có một công tắc (Toggle) để Bật (Active) hoặc Tắt (Inactive) sự tồn tại của pháp nhân đó trên hệ thống. (Lưu ý: Nếu tắt, nhân viên không thể tick chọn chi nhánh này để tạo đề nghị mới).
3. **Chỉnh sửa**: Chỉnh sửa MST, Tên công ty, Khóa viết tắt (Code).

![Quản trị Danh mục Công ty](./docs/images/admin-company.png)

---
*Tài liệu được cập nhật tự động vào tháng 4/2026. Nếu có vướng mắc trong thao tác, vui lòng liên hệ Admin hệ thống 1Gate.*
