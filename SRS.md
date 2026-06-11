<div align="center">
  <br><br><br>
  <h1 style="font-family: Calibri; font-size: 20pt; font-weight: bold; color: #000000;">[COMPANY] – 1GATE APP</h1>
  <h1 style="font-family: Calibri; font-size: 22pt; font-weight: bold; color: #000000;">Requirement Specifications</h1>
  <h1 style="font-family: Calibri; font-size: 22pt; font-weight: bold; color: #000000;">For 1Gate App</h1>
  <br>
  <p style="font-family: Calibri; font-size: 11pt;">Version: 1.0</p>
  <br>
  <p style="font-family: Calibri; font-size: 11pt; font-weight: bold;">[Location], [Month Year]</p>
  <br><br><br>
</div>

<div style="text-align: justify;">
<h1 style="font-family: Calibri; font-size: 20pt; font-weight: bold; color: #000000;">Approval Page</h1>
<p style="font-family: Calibri; font-size: 11pt;">The endorsement on this document by authorized representative indicates agreement on the "1Gate App Requirement Specifications" document.</p>
</div>

<table style="border: none; border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 11pt;">
  <tr>
    <td style="border: none; padding: 5px;"><b>Prepared by:</b></td>
    <td style="border: none; padding: 5px;">(FPT) BA Name</td>
    <td style="border: none; padding: 5px;"><b>Signature:</b> ________</td>
    <td style="border: none; padding: 5px;"><b>Date:</b> __/__/____</td>
  </tr>
  <tr>
    <td style="border: none; padding: 5px;"><b>Reviewed by:</b></td>
    <td style="border: none; padding: 5px;">(FPT) PM Name</td>
    <td style="border: none; padding: 5px;"><b>Signature:</b> ________</td>
    <td style="border: none; padding: 5px;"><b>Date:</b> __/__/____</td>
  </tr>
  <tr>
    <td style="border: none; padding: 5px;"><b>Supported by:</b></td>
    <td style="border: none; padding: 5px;">(Customer)</td>
    <td style="border: none; padding: 5px;"><b>Signature:</b> ________</td>
    <td style="border: none; padding: 5px;"><b>Date:</b> __/__/____</td>
  </tr>
  <tr>
    <td style="border: none; padding: 5px;"><b>Approved by:</b></td>
    <td style="border: none; padding: 5px;">(Customer)</td>
    <td style="border: none; padding: 5px;"><b>Signature:</b> ________</td>
    <td style="border: none; padding: 5px;"><b>Date:</b> __/__/____</td>
  </tr>
</table>

<div style="text-align: justify;">
<h1 style="font-family: Calibri; font-size: 20pt; font-weight: bold; color: #000000;">Revision History</h1>
</div>

<table style="border: 2px solid #BFBFBF; border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 11pt;">
  <tr style="background-color: #D9D9D9; font-weight: bold;">
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Date</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Version</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Author</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Change Description</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; color: #000000;">16/05/2026</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px; color: #000000;">1.0</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px; color: #000000;">Antigravity AI</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px; color: #000000;">First Creation</td>
  </tr>
</table>

<br/>

<h1 style="font-family: Calibri; font-size: 18pt; font-weight: bold; color: #1F3864;">1. Introduction</h1>

<h2 style="font-family: Calibri; font-size: 16pt; font-weight: bold; color: #1F3864;">1.1 Purpose</h2>
<p style="font-family: Calibri; font-size: 11pt;">Tài liệu này cung cấp đặc tả yêu cầu hệ thống (SRS) cho dự án 1Gate App. Tài liệu định nghĩa các yêu cầu chức năng (Functional Requirements), quy tắc nghiệp vụ (Business Rules), và yêu cầu phi chức năng (Non-Functional Requirements) nhằm đảm bảo sự thống nhất giữa các bên liên quan và đội ngũ phát triển.</p>

<h2 style="font-family: Calibri; font-size: 16pt; font-weight: bold; color: #1F3864;">1.2 Overview</h2>
<p style="font-family: Calibri; font-size: 11pt;">1Gate App là một Portal Nội bộ Tập trung nhằm chuyển đổi số các quy trình lõi trong tổ chức, đặc biệt tập trung vào phân hệ Phê duyệt và Mua sắm (Approval & Procurement workflow). Ứng dụng cho phép khởi tạo, theo dõi luồng duyệt, và kết tủa dữ liệu liên phòng ban trên một Dashboard thống nhất duy nhất.</p>

<h2 style="font-family: Calibri; font-size: 16pt; font-weight: bold; color: #1F3864;">1.3 Abbreviations</h2>
<table style="border: 2px solid #BFBFBF; border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 11pt;">
  <tr style="background-color: #D9D9D9; font-weight: bold;">
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Acronym</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Reference</td>
  </tr>
  <tr><td style="border: 1px solid #BFBFBF; padding: 8px;">AC</td><td style="border: 1px solid #BFBFBF; padding: 8px;">Acceptance Criteria</td></tr>
  <tr><td style="border: 1px solid #BFBFBF; padding: 8px;">BR</td><td style="border: 1px solid #BFBFBF; padding: 8px;">Business Rule</td></tr>
  <tr><td style="border: 1px solid #BFBFBF; padding: 8px;">SRS</td><td style="border: 1px solid #BFBFBF; padding: 8px;">System Requirement Specification</td></tr>
  <tr><td style="border: 1px solid #BFBFBF; padding: 8px;">UC</td><td style="border: 1px solid #BFBFBF; padding: 8px;">Use Case</td></tr>
</table>

<h1 style="font-family: Calibri; font-size: 18pt; font-weight: bold; color: #1F3864;">2. High Level Requirements</h1>

<h2 style="font-family: Calibri; font-size: 16pt; font-weight: bold; color: #1F3864;">2.1 Workflow</h2>
<p style="font-family: Calibri; font-size: 11pt;">
❖ Luồng quy trình Mua sắm & Phê duyệt (Dựa trên `schema.prisma` và `PROJECT_MAP.md`):<br>
  ⮚ Kế hoạch Mua sắm (Procurement Plan) -> Yêu cầu Vật tư (Material Request) -> Kiểm kho (Inventory Check) -> Yêu cầu Mua sắm (Purchase Request) -> Yêu cầu Tạm ứng (Advance Request) / Yêu cầu Thanh toán (Payment Request) -> Kế hoạch Thanh toán (Payment Plan) -> Quyết toán (Settlement).
</p>

<h2 style="font-family: Calibri; font-size: 16pt; font-weight: bold; color: #1F3864;">2.2 State Transition</h2>
<p style="font-family: Calibri; font-size: 11pt;">Các trạng thái của một Request (Căn cứ enum `RequestStatus`):</p>
<ul style="font-family: Calibri; font-size: 11pt;">
  <li>Draft: Khởi tạo, đang nháp</li>
  <li>Submitted: Đã trình duyệt</li>
  <li>PendingApproval: Đang chờ duyệt ở các cấp</li>
  <li>Approved: Đã được phê duyệt</li>
  <li>Rejected: Từ chối</li>
  <li>Returned: Yêu cầu làm lại</li>
  <li>Cancelled: Hủy bỏ</li>
  <li>Closed: Đóng luồng</li>
</ul>

<h2 style="font-family: Calibri; font-size: 16pt; font-weight: bold; color: #1F3864;">2.3 Permission Matrix</h2>
<p><i><span style="color:#FF0000">Tài liệu cần trình bày trên trang Landscape cho bảng này.</i></p>
<table style="border: 2px solid #BFBFBF; border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 11pt;">
  <tr style="background-color: #D9D9D9; font-weight: bold;">
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Module</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Admin</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Staff</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">DeptHead</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Warehouse</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Purchasing</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Accountant</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Director</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; font-weight: bold;">Procurement Plan</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O*</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">X</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">X</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; font-weight: bold;">Material Request</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O*</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">X</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; font-weight: bold;">Payment Request</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O*</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">X</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O*</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">O</td>
  </tr>
</table>

<h1 style="font-family: Calibri; font-size: 18pt; font-weight: bold; color: #1F3864;">3. Use Case Specifications</h1>

<h2 style="font-family: Calibri; font-size: 16pt; font-weight: bold; color: #1F3864;">3.1 Workflow Use case</h2>

<h3 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: #1F3864;">3.1.1 UC 1: Lập Kế hoạch Mua sắm (Procurement Plan)</h3>
<table style="border: 2px solid #BFBFBF; border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 11pt;">
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold; width: 30%;">Objective:</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Cho phép người dùng tạo Kế hoạch Mua sắm.</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold;">Actor:</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Staff, Admin, DeptHead, Purchasing</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold;">Trigger:</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Click "Tạo Kế hoạch Mua sắm mới" trên Dashboard.</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold;">Pre-condition:</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Người dùng đã đăng nhập và có quyền tương ứng.</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold;">Post-condition:</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Bản ghi Procurement Plan được tạo thành công ở trạng thái Draft hoặc Submitted.</td>
  </tr>
</table>

<p style="font-family: Calibri; font-size: 11pt; font-weight: bold; color: #1F3864;">Business Rules</p>
<table style="border: 2px solid #BFBFBF; border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 11pt;">
  <tr style="background-color: #D9D9D9; font-weight: bold;">
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Step</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">BR Code</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Description</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">(1)</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">BR 1</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;"><b>Validating Rules:</b> Người dùng phải nhập [Mã hồ sơ] (contractCode), [Tiêu đề] (title), [Danh sách vật tư] (ProcurementPlanItem). (Căn cứ schema.prisma model ProcurementPlan)</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">(2)</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">BR 2</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;"><b>Saving Rules:</b> Hệ thống lưu dữ liệu vào bảng `ProcurementPlan` với trạng thái mặc định là "Draft". Các mục con được lưu vào `ProcurementPlanItem`.</td>
  </tr>
</table>

<h3 style="font-family: Calibri; font-size: 14pt; font-weight: bold; color: #1F3864;">3.1.2 UC 2: Yêu cầu Thanh toán (Payment Request)</h3>
<table style="border: 2px solid #BFBFBF; border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 11pt;">
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold; width: 30%;">Objective:</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Người dùng tạo Đề nghị Thanh toán cho Nhà cung cấp.</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold;">Actor:</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Staff, Purchasing, DeptHead</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold;">Trigger:</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Click "Tạo Yêu cầu Thanh toán".</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold;">Pre-condition:</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Đã có Yêu cầu Mua sắm (Purchase Request) được duyệt (Tùy chọn) hoặc tạo thanh toán trực tiếp.</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold;">Post-condition:</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Yêu cầu Thanh toán chuyển sang trạng thái Submitted và gắn vào luồng duyệt.</td>
  </tr>
</table>

<p style="font-family: Calibri; font-size: 11pt; font-weight: bold; color: #1F3864;">Business Rules</p>
<table style="border: 2px solid #BFBFBF; border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 11pt;">
  <tr style="background-color: #D9D9D9; font-weight: bold;">
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Step</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">BR Code</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Description</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">(1)</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">BR 3</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;"><b>Validating Rules:</b> Kiểm tra Invoice Scenario (HasInvoice, InvoiceLater, NoInvoice). Nếu HasInvoice, phải đính kèm [InvoiceNumber], [InvoiceDate]. (Căn cứ schema PaymentRequest)</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">(2)</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">BR 4</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;"><b>Validating Rules:</b> Số tiền [Amount] không được phép rỗng. Log cảnh báo trùng hóa đơn (InvoiceDuplicateLog) nếu hệ thống phát hiện InvoiceNumber trùng lập từ cùng một Vendor.</td>
  </tr>
</table>

<h1 style="font-family: Calibri; font-size: 18pt; font-weight: bold; color: #1F3864;">4. Mockups Screen</h1>
<p style="font-family: Calibri; font-size: 11pt;">TBU (To be Updated dựa trên giao diện thực tế của 1Gate App)</p>

<h1 style="font-family: Calibri; font-size: 18pt; font-weight: bold; color: #1F3864;">5. Non-Functional Requirements</h1>
<table style="border: 2px solid #BFBFBF; border-collapse: collapse; width: 100%; font-family: Calibri; font-size: 11pt;">
  <tr style="background-color: #D9D9D9; font-weight: bold;">
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Title</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Variables / Criteria</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Remarks</td>
  </tr>
  <tr>
    <td colspan="3" style="border: 1px solid #BFBFBF; padding: 8px; background-color: #D9D9D9; font-weight: bold; text-align: center;">Security Requirements</td>
  </tr>
  <tr>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Authentication</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Đăng nhập qua Auth.js (NextAuth v5 beta), phân quyền bằng Role.</td>
    <td style="border: 1px solid #BFBFBF; padding: 8px;">Hỗ trợ Session management.</td>
  </tr>
</table>

<br>
<p style="font-family: Calibri; font-size: 11pt;"><i><span style="color:#FF0000">Lưu ý: Mọi quy tắc và luồng logic trong tài liệu này được suy xuất 100% từ mã nguồn (chủ yếu từ schema.prisma và luồng workflow khai báo trong dự án), không tự bịa đặt.</span></i></p>
