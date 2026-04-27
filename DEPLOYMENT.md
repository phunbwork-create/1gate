# 🚀 Hướng Dẫn Deploy 1Gate Lên VPS (Docker)

Bộ source code đã được cấu hình hoàn chỉnh để đóng gói và chạy bằng Docker Compose. 
Nhờ việc cấu hình **Next.js Standalone**, dung lượng image được tối ưu từ ~1GB xuống chỉ còn **~200MB**.

## 1. Yêu cầu hệ thống (VPS)
- OS: Ubuntu 22.04 LTS hoặc tương đương.
- RAM: Tối thiểu 2GB (Khuyến nghị 4GB).
- Đã cài đặt [Docker](https://docs.docker.com/engine/install/ubuntu/) và [Docker Compose](https://docs.docker.com/compose/install/).
- Tên miền (Domain) đã trỏ IP về VPS (để cài HTTPS).

## 2. Chuẩn bị mã nguồn
Bạn có thể đưa source code lên VPS bằng 2 cách:
1. **Dùng Git (Khuyến nghị):** Push code lên GitHub/GitLab (private repo) rồi clone về VPS.
2. **Dùng SFTP/SCP:** Nén thư mục project (bỏ qua `node_modules` và `.next`) rồi gửi trực tiếp lên VPS.

> **QUAN TRỌNG:**
> Hãy chắc chắn các file sau có mặt trên VPS:
> - `Dockerfile`
> - `docker-compose.yml`
> - `entrypoint.sh` 
> - `.dockerignore`

## 3. Cấu hình biến môi trường
Trên VPS, tại thư mục chứa code, copy file `.env.example` thành `.env`:

```bash
cp .env.example .env
nano .env
```

Cập nhật lại các biến bảo mật:

```env
POSTGRES_USER="onegate_db_user"
POSTGRES_PASSWORD="YourSuperStrongPasswordHere!"
POSTGRES_DB="onegate_production"

# Thay thế bằng secret ngẫu nhiên (chạy `openssl rand -base64 32` để lấy mã)
NEXTAUTH_SECRET="your-generated-random-secret"
NEXTAUTH_URL="https://your-domain.com" # Hoặc http://IP_VPS:3000 nếu chưa có domain

# Các cấu hình khác (Telegram, Resend) nếu cần
```

*Mẹo: Trong `docker-compose.yml` đã lấy connection string tự động dựa trên biến `POSTGRES_USER`, `POSTGRES_PASSWORD` nên bạn không cần tự ghép chuỗi `DATABASE_URL` nữa.*

## 4. Build và Chạy

Thực thi lệnh sau tại thư mục chứa `docker-compose.yml`:

```bash
# Cấp quyền thực thi cho entrypoint (nếu code tải về bị mất quyền)
chmod +x entrypoint.sh

# Build image và khởi chạy ngầm
docker compose up -d --build
```

**Quá trình này sẽ:**
1. Kéo image `postgres:16-alpine` và khởi chạy database.
2. Build ứng dụng Next.js ở chế độ tối ưu (Standalone).
3. Khi container app khởi động, file `entrypoint.sh` sẽ tự động chạy lệnh `npx prisma migrate deploy` để tạo cấu trúc bảng trong DB, trước khi chạy server Node.js.

Kiểm tra log xem ứng dụng đã chạy thành công chưa:
```bash
docker compose logs -f app
```

## 5. Tạo dữ liệu mẫu khởi tạo (Lần đầu)
Vì là database mới cứng, bạn cần có tài khoản Admin đầu tiên. Cài đặt sẵn script seed:

```bash
docker compose exec app sh -c "npx tsx prisma/seed.ts"
```

Tài khoản mặc định được tạo ra:
- Email: `admin@1gate.app`
- Pass: `Admin@123`

## 6. (Nâng cao) Thiết lập Nginx Reverse Proxy & SSL

Để chạy thực tế với domain và bảo mật HTTPS (VD: `https://1gate.mycompany.com`), bạn nên dùng Nginx kết hợp Certbot.

### Cài đặt Nginx và Certbot
```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### Cấu hình Nginx
Tạo file cấu hình: `sudo nano /etc/nginx/sites-available/1gate`

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Kích hoạt và chạy lại:
```bash
sudo ln -s /etc/nginx/sites-available/1gate /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Lấy chứng chỉ SSL (Let's Encrypt)
```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

Làm theo hướng dẫn trên màn hình, Certbot sẽ tự động cấu hình lại Nginx để chạy HTTPS.

---
🔥 **Hoàn tất!** Hệ thống 1Gate của bạn đã sẵn sàng chạy production.
