# 🚀 1Gate — Hướng Dẫn DevOps Build & Deploy (Docker)

## Tổng Quan Kiến Trúc

```
┌─────────────────────┐     docker push      ┌──────────────────┐     docker pull     ┌──────────────────┐
│   Máy Dev / CI/CD   │ ──────────────────► │  Docker Registry  │ ◄──────────────── │   VPS Production  │
│                     │                      │  (Hub/Harbor/GHCR)│                    │                  │
│  source code        │                      │  1gate-app:latest │                    │  docker-compose  │
│  + Dockerfile       │                      │                   │                    │  + .env          │
│  → docker build     │                      │                   │                    │  → docker up -d  │
└─────────────────────┘                      └──────────────────┘                    └──────────────────┘
```

**Workflow:**
1. **Build** image từ source code (tại máy dev hoặc CI/CD pipeline)
2. **Push** image lên Docker Registry (Docker Hub, Harbor, GHCR...)
3. **Pull & Run** trên VPS chỉ cần `docker-compose.yml` + `.env` (KHÔNG cần source code)

---

## 1. Yêu cầu hệ thống

### Máy Build (Dev / CI/CD)
- Docker Engine 20+ (có buildx)
- Quyền truy cập source code
- Tài khoản Docker Registry để push image

### Máy chạy (VPS Production)
- OS: Ubuntu 22.04 LTS hoặc tương đương
- RAM: Tối thiểu 2GB (Khuyến nghị 4GB)
- Docker Engine 20+ & Docker Compose v2
- **KHÔNG cần** source code, Node.js, npm

---

## 2. Build Docker Image (Tại máy Dev / CI)

### 2.1. Build image

```bash
# Di chuyển vào thư mục chứa source code + Dockerfile
cd /path/to/1gate-app

# Build image (Multi-stage: deps → build → runner, ~200MB final)
docker build -t 1gate-app:latest .
```

### 2.2. Tag theo registry

```bash
# Ví dụ 1: Docker Hub
docker tag 1gate-app:latest mycompany/1gate-app:latest
docker tag 1gate-app:latest mycompany/1gate-app:v1.0.0

# Ví dụ 2: Harbor (private registry)
docker tag 1gate-app:latest harbor.mycompany.com/smt/1gate-app:latest

# Ví dụ 3: GitHub Container Registry (GHCR)
docker tag 1gate-app:latest ghcr.io/myorg/1gate-app:latest
```

### 2.3. Push lên registry

```bash
# Login vào registry (chỉ cần 1 lần)
docker login              # Docker Hub
# docker login harbor.mycompany.com   # Harbor
# docker login ghcr.io                # GHCR

# Push image
docker push mycompany/1gate-app:latest
docker push mycompany/1gate-app:v1.0.0   # Tag version cụ thể (khuyến nghị)
```

### 2.4. (Tuỳ chọn) Build & Push bằng 1 lệnh

```bash
# Build + tag + push cùng lúc
docker build -t mycompany/1gate-app:latest -t mycompany/1gate-app:v1.0.0 .
docker push mycompany/1gate-app --all-tags
```

---

## 3. Deploy Trên VPS (Production)

### 3.1. Chuẩn bị trên VPS

Chỉ cần copy thư mục `docker-deploy-package/` lên VPS. Thư mục này chứa:
- `docker-compose.yml` — Cấu hình services (App + PostgreSQL)
- `.env.example` — Mẫu biến môi trường

```bash
# Trên VPS, tạo thư mục deploy
mkdir -p /opt/1gate && cd /opt/1gate

# Copy 2 file từ docker-deploy-package/ lên VPS
# Hoặc dùng scp/sftp/rsync từ máy dev:
# scp docker-deploy-package/* user@vps-ip:/opt/1gate/
```

### 3.2. Cấu hình biến môi trường

```bash
cp .env.example .env
nano .env
```

**Các biến BẮT BUỘC phải thay đổi:**

| Biến | Mô tả | Cách tạo |
|------|--------|----------|
| `IMAGE_NAME` | Tên image trên registry | VD: `mycompany/1gate-app` |
| `IMAGE_TAG` | Version tag | VD: `latest` hoặc `v1.0.0` |
| `POSTGRES_PASSWORD` | Mật khẩu DB | Đặt mật khẩu mạnh |
| `NEXTAUTH_SECRET` | JWT Secret | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL public | `https://your-domain.com` |

### 3.3. Login vào registry (nếu dùng private registry)

```bash
docker login harbor.mycompany.com
# hoặc: docker login ghcr.io
```

### 3.4. Pull image và khởi chạy

```bash
# Pull image mới nhất từ registry
docker compose pull

# Khởi chạy (chạy ngầm)
docker compose up -d
```

**Lần đầu chạy,** container app sẽ tự động:
1. Chạy `prisma migrate deploy` — tạo bảng trong PostgreSQL
2. Khởi động Next.js server

### 3.5. Kiểm tra

```bash
# Xem logs
docker compose logs -f app

# Kiểm tra health
docker compose ps

# Test truy cập
curl http://localhost:3000/login
```

### 3.6. Tạo tài khoản Admin (Lần đầu)

```bash
docker compose exec app sh -c "npx tsx prisma/seed.ts"
```

Tài khoản mặc định:
- Email: `admin@1gate.app`
- Password: `Admin@123`

> ⚠️ **Đổi mật khẩu admin ngay sau khi đăng nhập lần đầu!**

---

## 4. Cập Nhật Ứng Dụng

### Tại máy Build (Dev / CI):
```bash
# Build image mới
docker build -t mycompany/1gate-app:v1.1.0 -t mycompany/1gate-app:latest .
docker push mycompany/1gate-app --all-tags
```

### Tại VPS:
```bash
cd /opt/1gate

# (Tuỳ chọn) Cập nhật IMAGE_TAG trong .env nếu dùng version tag
# nano .env → IMAGE_TAG=v1.1.0

# Pull image mới & khởi động lại
docker compose pull
docker compose up -d
```

> Lệnh `up -d` sẽ tự phát hiện image mới và recreate container app. Database không bị ảnh hưởng.

---

## 5. Vận Hành Thường Ngày

| Tác vụ | Lệnh |
|--------|-------|
| Xem logs | `docker compose logs -f app` |
| Restart app | `docker compose restart app` |
| Tắt toàn bộ | `docker compose down` |
| Tắt + xoá data DB | `docker compose down -v` ⚠️ |
| Backup DB | `docker compose exec db pg_dump -U onegate onegate > backup.sql` |
| Restore DB | `cat backup.sql \| docker compose exec -T db psql -U onegate onegate` |
| Xem disk usage | `docker system df` |
| Dọn image cũ | `docker image prune -a` |

---

## 6. (Nâng Cao) Nginx Reverse Proxy + SSL

### Cài đặt
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### Cấu hình Nginx
Tạo file: `sudo nano /etc/nginx/sites-available/1gate`

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    client_max_body_size 50M;

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
sudo nginx -t
sudo systemctl reload nginx
```

### SSL (Let's Encrypt)
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

---

## 7. Thông Tin Kỹ Thuật Docker Image

| Thông số | Giá trị |
|----------|---------|
| Base image | `node:20-alpine` |
| Build stages | 3 (deps → builder → runner) |
| Final image size | ~200MB |
| User | `nextjs` (non-root, UID 1001) |
| Port | 3000 |
| Health check | `wget http://localhost:3000/login` mỗi 30s |
| Entrypoint | `entrypoint.sh` (chạy migrate → start server) |

---

🔥 **Hoàn tất!** Hệ thống 1Gate đã sẵn sàng cho production.
