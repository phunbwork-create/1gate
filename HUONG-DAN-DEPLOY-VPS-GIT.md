# 🚀 1Gate — Hướng dẫn DevOps: Kéo Git về & Deploy lên VPS (Docker)

> Luồng này: DevOps **clone source từ Git → build image ngay trên VPS → chạy bằng Docker Compose**.
> (Nếu VPS yếu RAM, xem **Phụ lục B** để build ở máy khác rồi pull image.)

Repo: `https://github.com/phunbwork-create/1gate.git` — thư mục ứng dụng: `1gate-app/`

---

## 0. Yêu cầu VPS

- OS: Ubuntu 22.04 LTS (hoặc tương đương)
- **RAM ≥ 4GB** (bước `next build` ngốn RAM; nếu chỉ 2GB phải bật swap — xem mục 7, hoặc dùng Phụ lục B)
- Đã cài: `git`, **Docker Engine 20+**, **Docker Compose v2** (`docker compose version`)
- Mở cổng 80/443 (nếu chạy qua domain) hoặc 3000 (nếu test trực tiếp)

```bash
# Cài Docker nhanh (Ubuntu)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker
docker compose version   # xác nhận có Compose v2
```

---

## 1. Clone source về VPS

```bash
sudo mkdir -p /opt/1gate && sudo chown $USER:$USER /opt/1gate
cd /opt/1gate
git clone https://github.com/phunbwork-create/1gate.git .
cd 1gate-app          # toàn bộ thao tác deploy nằm trong thư mục này
```

> Branch deploy: `main` (mới nhất, đã gồm bản vá RBAC + migrations).

---

## 2. Tạo Docker network dùng chung (BẮT BUỘC, làm 1 lần)

`docker-compose.yml` khai báo network `service-net` là **external** → phải tạo trước, nếu không `up` sẽ báo lỗi:

```bash
docker network create service-net   # nếu đã có sẽ báo "already exists" — bỏ qua
```

---

## 3. Cấu hình biến môi trường `.env`

Compose đọc file `.env` đặt **cùng thư mục** `docker-compose.yml` (tức `1gate-app/.env`). Tạo file:

```bash
nano .env
```

Dán nội dung sau và **đổi các giá trị bí mật**:

```dotenv
# ── App ──────────────────────────────────────────
APP_PORT=3000
IMAGE_NAME=1gate-app
IMAGE_TAG=latest

# ── PostgreSQL (chạy trong Docker) ───────────────
POSTGRES_USER=onegate
POSTGRES_PASSWORD=ĐẶT_MẬT_KHẨU_MẠNH_Ở_ĐÂY
POSTGRES_DB=onegate

# ── NextAuth (BẮT BUỘC đổi) ──────────────────────
# Tạo secret: openssl rand -base64 32
NEXTAUTH_SECRET=DÁN_CHUỖI_RANDOM_VÀO_ĐÂY
NEXTAUTH_URL=https://your-domain.com      # URL public thật; nếu test tạm: http://<IP-VPS>:3000

# ── Tuỳ chọn ─────────────────────────────────────
# RESEND_API_KEY=
# RESEND_FROM=noreply@1gate.app
# TELEGRAM_BOT_TOKEN=
# TELEGRAM_DEFAULT_CHAT_ID=
```

> **Không cần** tự set `DATABASE_URL` / `DIRECT_DATABASE_URL`: compose tự suy ra từ `POSTGRES_*` và trỏ vào container `db`. Chỉ override khi muốn dùng DB ngoài.

Tạo secret nhanh:
```bash
openssl rand -base64 32     # copy kết quả vào NEXTAUTH_SECRET
```

---

## 4. Build image & khởi chạy

```bash
# Build image từ source + chạy ngầm (DB + App)
docker compose up -d --build
```

Quá trình:
1. Dựng container PostgreSQL `db` (chờ healthy).
2. Build image app từ `Dockerfile` (multi-stage, standalone).
3. Container app khởi động → **`entrypoint.sh` tự chạy `prisma migrate deploy`** → tạo toàn bộ bảng từ `prisma/migrations/`.
4. Next.js server chạy ở cổng 3000.

Theo dõi:
```bash
docker compose logs -f app      # xem tới khi thấy "Starting Next.js Server..."
docker compose ps               # cả db và app phải "running"/"healthy"
```

---

## 5. ⚠️ Seed dữ liệu lần đầu (CỰC KỲ QUAN TRỌNG)

Sau migrate, DB mới chỉ có **bảng rỗng**. Phải seed **đúng 2 bước, đúng thứ tự**:

```bash
# B1: Seed dữ liệu nền (6 công ty, phòng ban, 14 user gồm admin) — mật khẩu mặc định 123456
docker compose exec app npx tsx prisma/seed.ts

# B2: Seed RBAC (8 vai trò, quyền, gán vai trò cho user, luồng duyệt) — BẮT BUỘC
docker compose exec app npx tsx prisma/seed-rbac.ts
```

> ❗ **Nếu bỏ B2**, ứng dụng vẫn chạy (có cơ chế fallback theo role cũ) nhưng các trang **Vai trò & Quyền / Workflow** sẽ trống. Luôn chạy cả 2.
> ❗ **Chỉ chạy seed 1 lần lúc khởi tạo.** Lần deploy sau KHÔNG seed lại (sẽ ghi đè/ trùng dữ liệu).

Tài khoản quản trị sau seed:
- **Email:** `admin@1gate.vn`
- **Mật khẩu:** `123456` → **đổi ngay sau lần đăng nhập đầu.**

---

## 6. Kiểm tra

```bash
curl -I http://localhost:3000/login          # mong đợi HTTP 200
docker compose exec app sh -c 'node -e "0"'   # container còn sống
```
Mở trình duyệt → `NEXTAUTH_URL` (hoặc `http://<IP-VPS>:3000`) → đăng nhập admin → phải thấy **đầy đủ menu** (8 menu chính + 7 menu Quản trị).

---

## 7. Nâng cấp khi có code mới (deploy lại)

```bash
cd /opt/1gate/1gate-app
git pull origin main

# Build lại image & restart (DB giữ nguyên dữ liệu)
docker compose up -d --build
```

- `entrypoint.sh` tự chạy `prisma migrate deploy` mỗi lần container app khởi động → **migration mới tự áp dụng**, KHÔNG mất dữ liệu.
- **KHÔNG chạy lại** `seed.ts` / `seed-rbac.ts` ở các lần nâng cấp.

> VPS 2GB hay OOM lúc build: bật swap tạm:
> ```bash
> sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
> sudo mkswap /swapfile && sudo swapon /swapfile
> ```

---

## 8. Nginx Reverse Proxy + SSL (chạy qua domain)

```bash
sudo apt update && sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/1gate
```
```nginx
server {
    listen 80;
    server_name your-domain.com;
    client_max_body_size 50M;          # cho upload file
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/1gate /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d your-domain.com        # cấp SSL Let's Encrypt
```
> Khi chạy qua HTTPS: đặt `NEXTAUTH_URL=https://your-domain.com` trong `.env` rồi `docker compose up -d` lại. (`AUTH_TRUST_HOST=true` đã bật sẵn trong compose.)

---

## 9. Vận hành thường ngày

| Tác vụ | Lệnh |
|--------|------|
| Xem log app | `docker compose logs -f app` |
| Restart app | `docker compose restart app` |
| Tắt | `docker compose down` |
| Tắt + XOÁ DB ⚠️ | `docker compose down -v` |
| Backup DB | `docker compose exec db pg_dump -U onegate onegate > backup_$(date +%F).sql` |
| Restore DB | `cat backup.sql \| docker compose exec -T db psql -U onegate onegate` |
| Vào shell container | `docker compose exec app sh` |
| Dọn image cũ | `docker image prune -a` |

---

## 🔧 Phụ lục A — Lỗi thường gặp

| Triệu chứng | Nguyên nhân & cách xử lý |
|-------------|--------------------------|
| `network service-net not found` | Chưa tạo network → chạy `docker network create service-net` (mục 2) |
| Đăng nhập được nhưng **mất menu** | Chưa chạy `prisma/seed-rbac.ts` (mục 5 – B2) |
| `next build` bị kill / OOM | VPS thiếu RAM → bật swap (mục 7) hoặc dùng Phụ lục B |
| App không kết nối DB | Sai `POSTGRES_PASSWORD` trong `.env`, hoặc container `db` chưa healthy — xem `docker compose logs db` |
| Đăng nhập xong bị đá ra / lỗi CSRF | `NEXTAUTH_URL` không khớp domain thật, hoặc thiếu HTTPS — sửa `.env` rồi `up -d` lại |

## 🔧 Phụ lục B — VPS yếu RAM: build nơi khác, VPS chỉ pull image

Nếu không build nổi trên VPS, dùng luồng **registry** đã có sẵn (chi tiết trong [DEPLOYMENT.md](DEPLOYMENT.md) và thư mục [docker-deploy-package/](docker-deploy-package/)):
1. Máy dev/CI: `docker build -t <registry>/1gate-app:latest . && docker push <registry>/1gate-app:latest`
2. VPS: chỉ cần `docker-deploy-package/docker-compose.yml` + `.env` → `docker compose pull && docker compose up -d`
3. Seed lần đầu giống mục 5.

---

✅ **Tóm tắt 6 lệnh cốt lõi (VPS, lần đầu):**
```bash
git clone https://github.com/phunbwork-create/1gate.git /opt/1gate && cd /opt/1gate/1gate-app
docker network create service-net
cp /dev/null .env && nano .env          # điền theo mục 3
docker compose up -d --build
docker compose exec app npx tsx prisma/seed.ts
docker compose exec app npx tsx prisma/seed-rbac.ts
```
