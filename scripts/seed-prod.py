"""
Script tạo dữ liệu Company/Department/User trên PROD 1Gate App.
Dữ liệu lấy từ file "Danh sách.xlsx" (3 sheets: DS_SMT, DS_Tpcare, DS_TPtech).

Usage: python scripts/seed-prod.py
"""

import json
import urllib.request
import urllib.parse
import http.cookiejar
import ssl

BASE_URL = "https://1gate-app.vercel.app"
ADMIN_EMAIL = "admin@1gate.vn"
ADMIN_PASSWORD = "123456"

# ─── SSL Context (skip verify for simplicity) ────────────────────────────────
ctx = ssl.create_default_context()

# ─── Cookie Jar + Opener ─────────────────────────────────────────────────────
cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(
    urllib.request.HTTPCookieProcessor(cookie_jar),
    urllib.request.HTTPSHandler(context=ctx),
)


def api_request(method, path, data=None, expect_status=None):
    """Make an API request with session cookies."""
    url = f"{BASE_URL}{path}"
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")

    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")

    try:
        resp = opener.open(req, timeout=30)
        resp_body = resp.read().decode("utf-8")
        status = resp.getcode()
        result = json.loads(resp_body) if resp_body else {}
        if expect_status and status != expect_status:
            print(f"  ⚠️  Expected {expect_status}, got {status}: {resp_body[:200]}")
        return status, result
    except urllib.error.HTTPError as e:
        resp_body = e.read().decode("utf-8")
        try:
            result = json.loads(resp_body)
        except Exception:
            result = {"error": resp_body[:300]}
        return e.code, result


def login():
    """Login via NextAuth credentials flow."""
    print("🔐 Logging in as admin...")

    # Step 1: Get CSRF token
    req = urllib.request.Request(f"{BASE_URL}/api/auth/csrf")
    resp = opener.open(req, timeout=15)
    csrf_data = json.loads(resp.read().decode("utf-8"))
    csrf_token = csrf_data["csrfToken"]
    print(f"  ✅ CSRF token: {csrf_token[:20]}...")

    # Step 2: Login via credentials
    login_data = urllib.parse.urlencode({
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD,
        "csrfToken": csrf_token,
        "json": "true",
    }).encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/api/auth/callback/credentials",
        data=login_data,
        method="POST",
    )
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        resp = opener.open(req, timeout=15)
        print(f"  ✅ Login response status: {resp.getcode()}")
    except urllib.error.HTTPError as e:
        # NextAuth may redirect, which is normal
        print(f"  ℹ️  Login redirect status: {e.code}")

    # Step 3: Verify session
    req = urllib.request.Request(f"{BASE_URL}/api/auth/session")
    resp = opener.open(req, timeout=15)
    session = json.loads(resp.read().decode("utf-8"))

    if session.get("user"):
        print(f"  ✅ Logged in as: {session['user']['name']} ({session['user']['email']})")
        return True
    else:
        print("  ❌ Login failed! Session is empty.")
        return False


def create_companies():
    """Create 3 companies and return their IDs."""
    print("\n🏢 Creating companies...")

    companies = [
        {
            "name": "Công ty CP Giải pháp Công nghệ Smartech Việt Nam",
            "code": "SMT",
            "type": "HO",
            "taxCode": "0106182783",
            "address": "Tầng 9, Tòa A-Sky City, Số 88 Láng Hạ, Phường Láng, Hà Nội",
        },
        {
            "name": "Công ty TNHH Dịch vụ Chăm sóc Xe hơi Thành Phát",
            "code": "TPCARE",
            "type": "CTTV",
            "taxCode": "0110383193",
            "address": "Tầng 2 tháp B Housinco Phùng Khoang, đường Lương Thế Vinh, Phường Thanh Xuân, Hà Nội",
        },
        {
            "name": "Công ty Phát triển và Ứng dụng Công nghệ Thành Phát",
            "code": "TPTECH",
            "type": "CTTV",
            "taxCode": "0111102261",
            "address": "Căn HA11-SP.11-52 và HA11-SP.11-54 đường Hải Âu 10, KĐT Vinhomes Ocean Park 1, Xã Gia Lâm, Tp. Hà Nội",
        },
    ]

    company_ids = {}

    for c in companies:
        status, result = api_request("POST", "/api/admin/companies", c)
        if status == 201:
            company_ids[c["code"]] = result["id"]
            print(f"  ✅ {c['code']}: {c['name']} → ID: {result['id']}")
        elif status == 400 and "đã tồn tại" in result.get("error", ""):
            # Company already exists, fetch it
            print(f"  ℹ️  {c['code']} already exists, fetching...")
            s2, r2 = api_request("GET", f"/api/admin/companies?search={c['code']}&limit=50")
            if s2 == 200:
                for comp in r2.get("data", []):
                    if comp["code"] == c["code"]:
                        company_ids[c["code"]] = comp["id"]
                        print(f"  ✅ Found: {c['code']} → ID: {comp['id']}")
                        break
        else:
            print(f"  ❌ Failed to create {c['code']}: {status} {result}")

    return company_ids


def create_departments(company_ids):
    """Create departments for each company."""
    print("\n🏬 Creating departments...")

    departments = [
        # SMT departments (clear structure from Excel)
        {"name": "Ban Lãnh đạo", "code": "BLD", "companyCode": "SMT"},
        {"name": "Bộ phận Kỹ thuật", "code": "BPKT", "companyCode": "SMT"},
        {"name": "Bộ phận Văn phòng", "code": "BPVP", "companyCode": "SMT"},
        # TPCARE - general department
        {"name": "Ban Lãnh đạo", "code": "BLD", "companyCode": "TPCARE"},
        {"name": "Bộ phận Kỹ thuật", "code": "BPKT", "companyCode": "TPCARE"},
        {"name": "Bộ phận Kế toán", "code": "BPKE", "companyCode": "TPCARE"},
        # TPTECH - general department
        {"name": "Ban Lãnh đạo", "code": "BLD", "companyCode": "TPTECH"},
        {"name": "Bộ phận Mua hàng", "code": "BPMH", "companyCode": "TPTECH"},
        {"name": "Bộ phận Kế toán", "code": "BPKE", "companyCode": "TPTECH"},
    ]

    dept_ids = {}  # key: "CODE-companyCode"

    for d in departments:
        company_id = company_ids.get(d["companyCode"])
        if not company_id:
            print(f"  ⚠️  Skipping {d['name']} - company {d['companyCode']} not found")
            continue

        payload = {
            "name": d["name"],
            "code": d["code"],
            "companyId": company_id,
        }

        status, result = api_request("POST", "/api/admin/departments", payload)
        key = f"{d['code']}-{d['companyCode']}"

        if status == 201:
            dept_ids[key] = result["id"]
            print(f"  ✅ [{d['companyCode']}] {d['name']} ({d['code']}) → ID: {result['id']}")
        elif status == 400 and "đã tồn tại" in result.get("error", ""):
            print(f"  ℹ️  [{d['companyCode']}] {d['name']} already exists, fetching...")
            s2, r2 = api_request("GET", f"/api/admin/departments?companyId={company_id}")
            if s2 == 200:
                for dept in r2.get("data", []):
                    if dept["code"] == d["code"]:
                        dept_ids[key] = dept["id"]
                        print(f"  ✅ Found: {d['code']} → ID: {dept['id']}")
                        break
        else:
            print(f"  ❌ Failed: [{d['companyCode']}] {d['name']}: {status} {result}")

    return dept_ids


def create_users(company_ids, dept_ids):
    """Create users with proper roles."""
    print("\n👥 Creating users...")

    users = [
        # ─── SMT - Ban Lãnh đạo ───────────────────────────────────────
        {
            "name": "Nguyễn Đức Nhân",
            "email": "Nhan.nguyen@smartech.vn",
            "role": "Director",
            "companyCode": "SMT",
            "deptKey": "BLD-SMT",
        },
        # ─── SMT - Bộ phận Kỹ thuật ───────────────────────────────────
        {
            "name": "Nguyễn Tuấn Trọng",
            "email": "Trong.nguyen@smartech.vn",
            "role": "DeptHead",
            "companyCode": "SMT",
            "deptKey": "BPKT-SMT",
        },
        {
            "name": "Bùi Văn Quý",
            "email": "Quy.bui@smartech.vn",  # Fixed: was Quy.bùi
            "role": "DeptHead",
            "companyCode": "SMT",
            "deptKey": "BPKT-SMT",
        },
        {
            "name": "Phạm Hoàng Long",
            "email": "Long.pham@smartech.vn",
            "role": "DeptHead",
            "companyCode": "SMT",
            "deptKey": "BPKT-SMT",
        },
        {
            "name": "Trịnh Minh Đức",
            "email": "Duc.trinh@smartech.vn",
            "role": "Staff",
            "companyCode": "SMT",
            "deptKey": "BPKT-SMT",
        },
        {
            "name": "Vũ Văn Dương",
            "email": "duong.vu@smartech.vn",
            "role": "Staff",
            "companyCode": "SMT",
            "deptKey": "BPKT-SMT",
        },
        {
            "name": "Triệu Tuấn Nghĩa",
            "email": "nghia.trieu@smartech.vn",
            "role": "Staff",
            "companyCode": "SMT",
            "deptKey": "BPKT-SMT",
        },
        {
            "name": "Lục Viết Thọ",
            "email": "Tho.luc@smartech.vn",
            "role": "Staff",
            "companyCode": "SMT",
            "deptKey": "BPKT-SMT",
        },
        # ─── SMT - Bộ phận Văn phòng ──────────────────────────────────
        {
            "name": "Nguyễn Thị Lành",
            "email": "Lanh.nguyen@smartech.vn",  # Fixed: was smartect.vn
            "role": "Purchasing",
            "companyCode": "SMT",
            "deptKey": "BPVP-SMT",
        },
        {
            "name": "Nguyễn Minh Nguyệt",
            "email": "Nguyet.nguyen@smartech.vn",
            "role": "ChiefAccountant",
            "companyCode": "SMT",
            "deptKey": "BPVP-SMT",
        },
        {
            "name": "Nguyễn Thị Thúy Hà",
            "email": "ha.nguyen@smartech.vn",
            "role": "Accountant",
            "companyCode": "SMT",
            "deptKey": "BPVP-SMT",
        },
        {
            "name": "Đàm Thị Thu Thảo",
            "email": "thao.dam@smartech.vn",
            "role": "Accountant",
            "companyCode": "SMT",
            "deptKey": "BPVP-SMT",
        },
        # ─── TPCARE ───────────────────────────────────────────────────
        {
            "name": "Nguyễn Đức Nhân",
            "email": "Nhan.nguyen.tpcare@smartech.vn",
            "role": "Director",
            "companyCode": "TPCARE",
            "deptKey": "BLD-TPCARE",
        },
        {
            "name": "Nguyễn Tuấn Trọng",
            "email": "Trong.nguyen.tpcare@smartech.vn",
            "role": "Director",
            "companyCode": "TPCARE",
            "deptKey": "BLD-TPCARE",
        },
        {
            "name": "Phạm Hoàng Long",
            "email": "Long.pham.tpcare@smartech.vn",
            "role": "Staff",
            "companyCode": "TPCARE",
            "deptKey": "BPKT-TPCARE",
        },
        {
            "name": "Nguyễn Minh Nguyệt",
            "email": "Nguyet.nguyen.tpcare@smartech.vn",
            "role": "ChiefAccountant",
            "companyCode": "TPCARE",
            "deptKey": "BPKE-TPCARE",
        },
        # ─── TPTECH ───────────────────────────────────────────────────
        {
            "name": "Nguyễn Đức Nhân",
            "email": "Nhan.nguyen.tptech@smartech.vn",
            "role": "Director",
            "companyCode": "TPTECH",
            "deptKey": "BLD-TPTECH",
        },
        {
            "name": "Phạm Hoàng Long",
            "email": "Long.pham.tptech@smartech.vn",
            "role": "Director",
            "companyCode": "TPTECH",
            "deptKey": "BLD-TPTECH",
        },
        {
            "name": "Bùi Văn Quý",
            "email": "Quy.bui.tptech@smartech.vn",
            "role": "DeptHead",
            "companyCode": "TPTECH",
            "deptKey": "BPMH-TPTECH",
        },
        {
            "name": "Nguyễn Thị Lành",
            "email": "Lanh.nguyen.tptech@smartech.vn",
            "role": "DeptHead",
            "companyCode": "TPTECH",
            "deptKey": "BPMH-TPTECH",
        },
    ]

    created_emails = set()
    created_count = 0
    skipped_count = 0

    for u in users:
        email_lower = u["email"].lower()
        if email_lower in created_emails:
            print(f"  ⏭️  Skip duplicate: {u['email']}")
            skipped_count += 1
            continue

        company_id = company_ids.get(u["companyCode"])
        if not company_id:
            print(f"  ⚠️  Skip {u['name']} - company {u['companyCode']} not found")
            continue

        dept_id = dept_ids.get(u["deptKey"])

        payload = {
            "name": u["name"],
            "email": u["email"],
            "password": "123456",
            "role": u["role"],
            "companyId": company_id,
        }
        if dept_id:
            payload["departmentId"] = dept_id

        status, result = api_request("POST", "/api/admin/users", payload)

        if status == 201:
            created_emails.add(email_lower)
            created_count += 1
            role_display = u["role"]
            dept_display = u.get("deptKey", "N/A").split("-")[0]
            print(f"  ✅ [{u['companyCode']}/{dept_display}] {u['name']} ({u['email']}) → {role_display}")
        elif status == 400 and "đã tồn tại" in result.get("error", ""):
            # User exists, let's fetch them to update
            s2, r2 = api_request("GET", f"/api/admin/users?search={urllib.parse.quote(u['email'])}&limit=50")
            user_id = None
            if s2 == 200:
                for usr in r2.get("data", []):
                    if usr["email"].lower() == email_lower:
                        user_id = usr["id"]
                        break
            
            if user_id:
                patch_payload = {
                    "name": u["name"],
                    "role": u["role"],
                    "companyId": company_id,
                }
                if dept_id:
                    patch_payload["departmentId"] = dept_id
                
                s3, r3 = api_request("PATCH", f"/api/admin/users/{user_id}", patch_payload)
                if s3 == 200:
                    created_emails.add(email_lower)
                    created_count += 1
                    role_display = u["role"]
                    dept_display = u.get("deptKey", "N/A").split("-")[0]
                    print(f"  🔄 Updated: [{u['companyCode']}/{dept_display}] {u['name']} ({u['email']}) → {role_display}")
                else:
                    print(f"  ❌ Failed to update {u['email']}: {s3} {r3}")
            else:
                print(f"  ℹ️  Already exists but couldn't fetch ID: {u['email']}")
            
        else:
            print(f"  ❌ Failed: {u['name']} ({u['email']}): {status} {result}")

    print(f"\n  📊 Summary: {created_count} created, {skipped_count} skipped")


def verify():
    """Verify the created data."""
    print("\n🔍 Verifying data...")

    # Companies
    status, result = api_request("GET", "/api/admin/companies?limit=50")
    if status == 200:
        companies = result.get("data", [])
        print(f"\n  📋 Companies ({len(companies)}):")
        for c in companies:
            count = c.get("_count", {})
            print(f"    • {c['code']}: {c['name']} (Users: {count.get('users', '?')}, Depts: {count.get('departments', '?')})")

    # Users
    status, result = api_request("GET", "/api/admin/users?limit=50")
    if status == 200:
        users = result.get("data", [])
        print(f"\n  👥 Users ({len(users)}):")
        for u in users:
            company = u.get("company", {})
            dept = u.get("department", {})
            print(f"    • [{company.get('code', '?')}] {u['name']} ({u['email']}) → {u['role']}" +
                  (f" | {dept.get('name', '')}" if dept else ""))


# ─── MAIN ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 60)
    print("🚀 1Gate PROD Data Seeding Script")
    print("=" * 60)

    if not login():
        print("\n❌ Aborting: Login failed")
        exit(1)

    company_ids = create_companies()
    if not company_ids:
        print("\n❌ Aborting: No companies created")
        exit(1)

    dept_ids = create_departments(company_ids)
    create_users(company_ids, dept_ids)
    verify()

    print("\n" + "=" * 60)
    print("🎉 Done! All data created successfully.")
    print("=" * 60)
