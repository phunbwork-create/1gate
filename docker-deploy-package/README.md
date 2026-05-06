# 1Gate — Bộ Deploy Production

Bộ file cấu hình để chạy 1Gate trên VPS. **KHÔNG yêu cầu source code trên server.**

## Cấu trúc

```
docker-deploy-package/
├── docker-compose.yml   # Cấu hình services (App + PostgreSQL)
└── .env.example         # Mẫu biến môi trường
```

## Hướng Dẫn Nhanh

### Bước 1: Build & Push Image (tại máy dev / CI)

```bash
# Tại thư mục chứa source code 1gate-app
docker build -t <registry>/1gate-app:latest .
docker push <registry>/1gate-app:latest
```

### Bước 2: Deploy trên VPS

```bash
# 1. Copy docker-compose.yml và .env.example lên VPS
# 2. Cấu hình
cp .env.example .env
nano .env    # Sửa IMAGE_NAME, POSTGRES_PASSWORD, NEXTAUTH_SECRET, NEXTAUTH_URL

# 3. Login registry (nếu private)
docker login <registry>

# 4. Chạy
docker compose pull
docker compose up -d

# 5. Tạo tài khoản admin (lần đầu)
docker compose exec app sh -c "npx tsx prisma/seed.ts"
```

### Cập nhật

```bash
# Tại máy dev: build + push image mới
docker build -t <registry>/1gate-app:latest .
docker push <registry>/1gate-app:latest

# Tại VPS: pull + restart
docker compose pull
docker compose up -d
```

📖 Xem hướng dẫn chi tiết tại [DEPLOYMENT.md](../DEPLOYMENT.md)
