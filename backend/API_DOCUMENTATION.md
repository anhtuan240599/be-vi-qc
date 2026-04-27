# Admin User Management API

Base URL: `https://be-vi-qc.onrender.com`
Swagger UI: `https://be-vi-qc.onrender.com/api-docs`

---

## Authentication

Login để lấy `accessToken` (15 phút) + `refreshToken` (7 ngày).
Gắn token vào header cho các request cần auth:
```
Authorization: Bearer <accessToken>
```

---

## Endpoints

### Health Check

| Method | URL | Auth | Mô tả |
|--------|-----|------|-------|
| GET | `/api/health` | ❌ | Kiểm tra server |

---

### Auth

| Method | URL | Auth | Mô tả |
|--------|-----|------|-------|
| POST | `/api/auth/register` | ❌ | Đăng ký admin |
| POST | `/api/auth/login` | ❌ | Đăng nhập |
| POST | `/api/auth/refresh` | ❌ | Lấy token mới |
| POST | `/api/auth/logout` | ✅ | Đăng xuất |
| GET | `/api/auth/me` | ✅ | Xem thông tin mình |

#### Register
```json
POST /api/auth/register
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "123456"
}
// → 201: tạo thành công
// → 400: thiếu field / password < 6 ký tự / email sai format
// → 409: username hoặc email đã tồn tại
```

#### Login
```json
POST /api/auth/login
{
  "email": "admin@example.com",
  "password": "123456"
}
// → 200: { accessToken, refreshToken, user }
// → 400: thiếu field
// → 401: sai email/password
// → 403: tài khoản inactive
```

#### Refresh Token
```json
POST /api/auth/refresh
{
  "refreshToken": "<refresh_token_từ_login>"
}
// → 200: { accessToken (mới), refreshToken (mới) }
// → 400: thiếu refreshToken
// → 401: token sai / hết hạn / đã dùng rồi
```

#### Logout
```json
POST /api/auth/logout
Header: Authorization: Bearer <accessToken>
{
  "refreshToken": "<refresh_token>"
}
// → 200: logout thành công
```

---

### Users (tất cả cần Bearer Token)

| Method | URL | Mô tả |
|--------|-----|-------|
| GET | `/api/users` | Danh sách users |
| GET | `/api/users/:id` | Xem 1 user |
| POST | `/api/users` | Tạo user |
| PUT | `/api/users/:id` | Cập nhật user |
| PATCH | `/api/users/:id` | Cập nhật 1 phần |
| DELETE | `/api/users/:id` | Xóa user |

#### List Users
```
GET /api/users?page=1&limit=10&search=admin
// → 200: { data: [...], pagination: { page, limit, total, totalPages } }
```

#### Get User
```
GET /api/users/1
// → 200: user data
// → 404: không tìm thấy
```

#### Create User
```json
POST /api/users
{
  "username": "john",
  "email": "john@example.com",
  "password": "123456",
  "role": "user",        // optional: "admin" | "user" (default: "user")
  "status": "active"     // optional: "active" | "inactive" (default: "active")
}
// → 201: tạo thành công
// → 400: thiếu field / validation lỗi
// → 409: trùng username/email
```

#### Update User
```json
PUT /api/users/1
{
  "username": "john_v2",
  "email": "john_new@example.com",
  "role": "admin"
}
// Không gửi password = giữ password cũ
// → 200: cập nhật thành công
// → 404: user không tồn tại
// → 409: trùng username/email
```

#### Delete User
```
DELETE /api/users/1
// → 200: xóa thành công
// → 404: user không tồn tại
```

---

## Response Format

```json
// Thành công
{ "success": true, "data": {...}, "message": "..." }

// Lỗi
{ "success": false, "error": { "code": 400, "message": "..." } }
```

## Status Codes

| Code | Ý nghĩa |
|------|---------|
| 200 | OK |
| 201 | Tạo mới thành công |
| 400 | Request sai (thiếu field, sai format) |
| 401 | Chưa login / token hết hạn |
| 403 | Tài khoản inactive |
| 404 | Không tìm thấy |
| 409 | Dữ liệu trùng |
