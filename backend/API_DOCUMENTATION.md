# Admin User Management API Documentation

Base URL: `http://localhost:3000`

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Cách chạy server](#2-cách-chạy-server)
3. [Cơ chế Authentication](#3-cơ-chế-authentication)
4. [Định dạng Response](#4-định-dạng-response)
5. [API Endpoints](#5-api-endpoints)
   - [Health Check](#51-health-check)
   - [Auth - Register](#52-register)
   - [Auth - Login](#53-login)
   - [Auth - Refresh Token](#54-refresh-token)
   - [Auth - Logout](#55-logout)
   - [Auth - Get Current User](#56-get-current-user)
   - [Users - List](#57-list-users)
   - [Users - Get By ID](#58-get-user-by-id)
   - [Users - Create](#59-create-user)
   - [Users - Update (PUT)](#510-update-user-put)
   - [Users - Update (PATCH)](#511-update-user-patch)
   - [Users - Delete](#512-delete-user)
6. [Status Codes](#6-status-codes)
7. [Test Scenarios cho QC](#7-test-scenarios-cho-qc)

---

## 1. Tổng quan

API quản lý user cho admin page. Hỗ trợ đầy đủ CRUD users với JWT authentication và refresh token.

**Tech stack:** Node.js, Express, SQLite, JWT, bcrypt

---

## 2. Cách chạy server

```bash
cd backend
npm install
npm start
```

Server chạy tại `http://localhost:3000`

---

## 3. Cơ chế Authentication

### Flow:
1. Gọi `POST /api/auth/login` → nhận `accessToken` (15 phút) + `refreshToken` (7 ngày)
2. Gắn access token vào header cho mọi request cần auth:
   ```
   Authorization: Bearer <accessToken>
   ```
3. Khi access token hết hạn → gọi `POST /api/auth/refresh` với refresh token → nhận cặp token mới
4. Khi logout → gọi `POST /api/auth/logout` để xóa refresh token khỏi DB

### Lưu ý:
- Access token hết hạn sau **15 phút**
- Refresh token hết hạn sau **7 ngày**
- Mỗi lần refresh, token cũ bị xóa và tạo cặp mới (rotation)
- Refresh token chỉ dùng được **1 lần**

---

## 4. Định dạng Response

### Thành công:
```json
{
  "success": true,
  "data": { ... },
  "message": "..."
}
```

### Thành công (có phân trang):
```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

### Lỗi:
```json
{
  "success": false,
  "error": {
    "code": 400,
    "message": "Mô tả lỗi"
  }
}
```

---

## 5. API Endpoints

### 5.1 Health Check

Kiểm tra server có đang chạy không.

```
GET /api/health
```

**Auth:** Không cần

**Response 200:**
```json
{
  "success": true,
  "message": "API is running"
}
```

---

### 5.2 Register

Đăng ký tài khoản admin đầu tiên.

```
POST /api/auth/register
```

**Auth:** Không cần

**Request Body:**
```json
{
  "username": "admin",
  "email": "admin@example.com",
  "password": "123456"
}
```

| Field    | Type   | Required | Validation                    |
|----------|--------|----------|-------------------------------|
| username | string | ✅       | Unique                        |
| email    | string | ✅       | Unique, phải đúng format email |
| password | string | ✅       | Tối thiểu 6 ký tự            |

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "status": "active",
    "created_at": "2025-04-27 10:00:00"
  },
  "message": "Admin registered successfully"
}
```

**Lỗi có thể xảy ra:**
| Status | Khi nào                          |
|--------|----------------------------------|
| 400    | Thiếu field / password < 6 ký tự / email sai format |
| 409    | Username hoặc email đã tồn tại  |

---

### 5.3 Login

Đăng nhập, nhận access token và refresh token.

```
POST /api/auth/login
```

**Auth:** Không cần

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "123456"
}
```

| Field    | Type   | Required |
|----------|--------|----------|
| email    | string | ✅       |
| password | string | ✅       |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "a1b2c3d4e5f6...",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin"
    }
  },
  "message": "Login successful"
}
```

**Lỗi có thể xảy ra:**
| Status | Khi nào                        |
|--------|--------------------------------|
| 400    | Thiếu email hoặc password      |
| 401    | Email không tồn tại / sai password |
| 403    | Tài khoản bị inactive          |

---

### 5.4 Refresh Token

Lấy cặp token mới khi access token hết hạn.

```
POST /api/auth/refresh
```

**Auth:** Không cần (dùng refresh token trong body)

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...(mới)",
    "refreshToken": "x9y8z7w6v5u4...(mới)"
  },
  "message": "Token refreshed successfully"
}
```

**Lỗi có thể xảy ra:**
| Status | Khi nào                                    |
|--------|--------------------------------------------|
| 400    | Thiếu refreshToken                         |
| 401    | Token không hợp lệ / đã hết hạn / user inactive |

**Lưu ý:** Sau khi refresh, token cũ bị xóa. Phải dùng token mới cho lần refresh tiếp theo.

---

### 5.5 Logout

Đăng xuất, xóa refresh token khỏi database.

```
POST /api/auth/logout
```

**Auth:** ✅ Bearer Token

**Request Body:**
```json
{
  "refreshToken": "a1b2c3d4e5f6..."
}
```

**Response 200:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 5.6 Get Current User

Lấy thông tin user đang đăng nhập.

```
GET /api/auth/me
```

**Auth:** ✅ Bearer Token

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "status": "active",
    "created_at": "2025-04-27 10:00:00",
    "updated_at": "2025-04-27 10:00:00"
  }
}
```

**Lỗi có thể xảy ra:**
| Status | Khi nào                    |
|--------|----------------------------|
| 401    | Không có token / token hết hạn / token sai |
| 404    | User không tồn tại        |

---

### 5.7 List Users

Lấy danh sách users có phân trang và tìm kiếm.

```
GET /api/users
```

**Auth:** ✅ Bearer Token

**Query Parameters:**
| Param  | Type   | Default | Mô tả                              |
|--------|--------|---------|-------------------------------------|
| page   | number | 1       | Trang hiện tại (min: 1)             |
| limit  | number | 10      | Số record mỗi trang (min: 1, max: 100) |
| search | string | ""      | Tìm theo username hoặc email        |

**Ví dụ:**
```
GET /api/users?page=1&limit=5&search=admin
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "admin",
      "status": "active",
      "created_at": "2025-04-27 10:00:00",
      "updated_at": "2025-04-27 10:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 5.8 Get User By ID

Lấy thông tin 1 user theo ID.

```
GET /api/users/:id
```

**Auth:** ✅ Bearer Token

**Ví dụ:** `GET /api/users/1`

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "role": "admin",
    "status": "active",
    "created_at": "2025-04-27 10:00:00",
    "updated_at": "2025-04-27 10:00:00"
  }
}
```

**Lỗi có thể xảy ra:**
| Status | Khi nào              |
|--------|----------------------|
| 401    | Không có / sai token |
| 404    | ID không tồn tại     |

---

### 5.9 Create User

Tạo user mới.

```
POST /api/users
```

**Auth:** ✅ Bearer Token

**Request Body:**
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "123456",
  "role": "user",
  "status": "active"
}
```

| Field    | Type   | Required | Default  | Validation                         |
|----------|--------|----------|----------|------------------------------------|
| username | string | ✅       |          | Unique                             |
| email    | string | ✅       |          | Unique, đúng format email          |
| password | string | ✅       |          | Tối thiểu 6 ký tự                 |
| role     | string | ❌       | "user"   | Chỉ chấp nhận: "admin" hoặc "user" |
| status   | string | ❌       | "active" | Chỉ chấp nhận: "active" hoặc "inactive" |

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "john",
    "email": "john@example.com",
    "role": "user",
    "status": "active",
    "created_at": "2025-04-27 10:05:00",
    "updated_at": "2025-04-27 10:05:00"
  },
  "message": "User created successfully"
}
```

**Lỗi có thể xảy ra:**
| Status | Khi nào                                          |
|--------|--------------------------------------------------|
| 400    | Thiếu field / password ngắn / email sai / role sai / status sai |
| 401    | Không có / sai token                             |
| 409    | Username hoặc email đã tồn tại                   |

---

### 5.10 Update User (PUT)

Cập nhật toàn bộ thông tin user.

```
PUT /api/users/:id
```

**Auth:** ✅ Bearer Token

**Ví dụ:** `PUT /api/users/2`

**Request Body:**
```json
{
  "username": "john_updated",
  "email": "john_new@example.com",
  "password": "newpass123",
  "role": "admin",
  "status": "inactive"
}
```

| Field    | Type   | Required | Mô tả                                    |
|----------|--------|----------|-------------------------------------------|
| username | string | ❌       | Nếu không gửi, giữ nguyên giá trị cũ     |
| email    | string | ❌       | Nếu không gửi, giữ nguyên giá trị cũ     |
| password | string | ❌       | Nếu không gửi, giữ nguyên password cũ    |
| role     | string | ❌       | "admin" hoặc "user"                       |
| status   | string | ❌       | "active" hoặc "inactive"                  |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "username": "john_updated",
    "email": "john_new@example.com",
    "role": "admin",
    "status": "inactive",
    "created_at": "2025-04-27 10:05:00",
    "updated_at": "2025-04-27 10:10:00"
  },
  "message": "User updated successfully"
}
```

**Lỗi có thể xảy ra:**
| Status | Khi nào                                |
|--------|----------------------------------------|
| 400    | Email sai format / role sai / status sai |
| 401    | Không có / sai token                   |
| 404    | User ID không tồn tại                  |
| 409    | Username hoặc email bị trùng           |

---

### 5.11 Update User (PATCH)

Cập nhật một phần thông tin user. Hoạt động giống PUT.

```
PATCH /api/users/:id
```

Tham số và response giống [5.10 Update User (PUT)](#510-update-user-put).

---

### 5.12 Delete User

Xóa user theo ID.

```
DELETE /api/users/:id
```

**Auth:** ✅ Bearer Token

**Ví dụ:** `DELETE /api/users/2`

**Response 200:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Lỗi có thể xảy ra:**
| Status | Khi nào              |
|--------|----------------------|
| 401    | Không có / sai token |
| 404    | User ID không tồn tại |

---

## 6. Status Codes

| Code | Ý nghĩa                                      |
|------|-----------------------------------------------|
| 200  | Thành công                                    |
| 201  | Tạo mới thành công                            |
| 400  | Request không hợp lệ (thiếu field, sai format) |
| 401  | Chưa đăng nhập / token hết hạn / token sai   |
| 403  | Tài khoản bị inactive                         |
| 404  | Không tìm thấy resource / route               |
| 409  | Dữ liệu bị trùng (username, email)            |
| 500  | Lỗi server                                    |

---

## 7. Test Scenarios cho QC

### Authentication Tests

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 1 | Register với đầy đủ thông tin | POST | /api/auth/register | 201 |
| 2 | Register thiếu username | POST | /api/auth/register | 400 |
| 3 | Register thiếu email | POST | /api/auth/register | 400 |
| 4 | Register thiếu password | POST | /api/auth/register | 400 |
| 5 | Register password < 6 ký tự | POST | /api/auth/register | 400 |
| 6 | Register email sai format | POST | /api/auth/register | 400 |
| 7 | Register email đã tồn tại | POST | /api/auth/register | 409 |
| 8 | Register username đã tồn tại | POST | /api/auth/register | 409 |
| 9 | Login đúng email + password | POST | /api/auth/login | 200 |
| 10 | Login thiếu email | POST | /api/auth/login | 400 |
| 11 | Login thiếu password | POST | /api/auth/login | 400 |
| 12 | Login email không tồn tại | POST | /api/auth/login | 401 |
| 13 | Login sai password | POST | /api/auth/login | 401 |
| 14 | Login tài khoản inactive | POST | /api/auth/login | 403 |
| 15 | Get /me với token hợp lệ | GET | /api/auth/me | 200 |
| 16 | Get /me không có token | GET | /api/auth/me | 401 |
| 17 | Get /me với token hết hạn | GET | /api/auth/me | 401 |
| 18 | Get /me với token sai | GET | /api/auth/me | 401 |

### Refresh Token Tests

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 19 | Refresh với token hợp lệ | POST | /api/auth/refresh | 200 + cặp token mới |
| 20 | Refresh thiếu refreshToken | POST | /api/auth/refresh | 400 |
| 21 | Refresh với token không tồn tại | POST | /api/auth/refresh | 401 |
| 22 | Refresh với token đã dùng rồi (rotation) | POST | /api/auth/refresh | 401 |
| 23 | Refresh với token hết hạn | POST | /api/auth/refresh | 401 |
| 24 | Refresh khi user bị inactive | POST | /api/auth/refresh | 401 |
| 25 | Dùng access token mới sau refresh để gọi API | GET | /api/users | 200 |
| 26 | Dùng access token cũ sau refresh | GET | /api/users | 401 (vì hết hạn) |

### Logout Tests

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 27 | Logout với refresh token | POST | /api/auth/logout | 200 |
| 28 | Dùng refresh token sau khi logout | POST | /api/auth/refresh | 401 |
| 29 | Logout không có Bearer token | POST | /api/auth/logout | 401 |

### User CRUD Tests

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 30 | List users (mặc định page=1, limit=10) | GET | /api/users | 200 |
| 31 | List users với page=2 | GET | /api/users?page=2 | 200 |
| 32 | List users với limit=5 | GET | /api/users?limit=5 | 200, data.length <= 5 |
| 33 | List users search theo username | GET | /api/users?search=admin | 200 |
| 34 | List users search không có kết quả | GET | /api/users?search=xyz123 | 200, data = [] |
| 35 | List users không có token | GET | /api/users | 401 |
| 36 | Get user by ID tồn tại | GET | /api/users/1 | 200 |
| 37 | Get user by ID không tồn tại | GET | /api/users/9999 | 404 |
| 38 | Create user đầy đủ thông tin | POST | /api/users | 201 |
| 39 | Create user chỉ required fields | POST | /api/users | 201, role=user, status=active |
| 40 | Create user thiếu username | POST | /api/users | 400 |
| 41 | Create user thiếu email | POST | /api/users | 400 |
| 42 | Create user thiếu password | POST | /api/users | 400 |
| 43 | Create user password < 6 ký tự | POST | /api/users | 400 |
| 44 | Create user email sai format | POST | /api/users | 400 |
| 45 | Create user role không hợp lệ | POST | /api/users | 400 |
| 46 | Create user status không hợp lệ | POST | /api/users | 400 |
| 47 | Create user email đã tồn tại | POST | /api/users | 409 |
| 48 | Create user username đã tồn tại | POST | /api/users | 409 |
| 49 | Update user (PUT) thành công | PUT | /api/users/:id | 200 |
| 50 | Update user chỉ đổi username | PATCH | /api/users/:id | 200 |
| 51 | Update user đổi password | PUT | /api/users/:id | 200 |
| 52 | Update user không gửi password (giữ cũ) | PUT | /api/users/:id | 200 |
| 53 | Update user ID không tồn tại | PUT | /api/users/9999 | 404 |
| 54 | Update user email sai format | PUT | /api/users/:id | 400 |
| 55 | Update user email bị trùng user khác | PUT | /api/users/:id | 409 |
| 56 | Update user role không hợp lệ | PUT | /api/users/:id | 400 |
| 57 | Update user status không hợp lệ | PUT | /api/users/:id | 400 |
| 58 | Delete user thành công | DELETE | /api/users/:id | 200 |
| 59 | Delete user ID không tồn tại | DELETE | /api/users/9999 | 404 |
| 60 | Delete user không có token | DELETE | /api/users/:id | 401 |

### Edge Cases

| # | Test Case | Method | Endpoint | Expected |
|---|-----------|--------|----------|----------|
| 61 | Gọi route không tồn tại | GET | /api/xyz | 404 |
| 62 | Gửi body rỗng khi create user | POST | /api/users | 400 |
| 63 | Gửi Content-Type không phải JSON | POST | /api/auth/login | 400 hoặc lỗi parse |
| 64 | Pagination page=0 | GET | /api/users?page=0 | 200 (auto thành page=1) |
| 65 | Pagination limit=0 | GET | /api/users?limit=0 | 200 (auto thành limit=1) |
| 66 | Pagination limit=999 | GET | /api/users?limit=999 | 200 (auto cap thành limit=100) |
| 67 | Health check | GET | /api/health | 200 |
